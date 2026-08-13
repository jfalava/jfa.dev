import type { ESTree } from "@oxlint/plugins";

const BUILT_INS = new Set([
  "Record",
  "Readonly",
  "Partial",
  "Required",
  "Pick",
  "Omit",
  "PropertyKey",
  "NonNullable",
]);
const TRANSPARENT_WRAPPERS = new Set(["Readonly", "Partial", "Required", "NonNullable"]);

type TypeAliasEnvironment = ReadonlyMap<string, ESTree.TSType>;

type ResolvedType = {
  readonly type: ESTree.TSType;
  readonly substitutions: TypeAliasEnvironment;
};

type TypeEnvironmentMaps = {
  readonly aliases: Map<string, ESTree.TSTypeAliasDeclaration>;
  readonly interfaces: Map<string, ESTree.TSInterfaceDeclaration[]>;
  readonly shadowedBuiltIns: Set<string>;
};

export type UnsafeDictionary = {
  readonly kind: "unsafe-dictionary";
  readonly unsafeValue: "any" | "empty-object" | "object" | "union" | "unknown";
};

export type WideningTargetKind =
  | "anonymous object"
  | "generic container"
  | "object"
  | "open dictionary"
  | "unknown";

export type WideningTarget = {
  readonly kind: WideningTargetKind;
};

export type TypeEnvironment = {
  readonly aliases: ReadonlyMap<string, ESTree.TSTypeAliasDeclaration>;
  readonly interfaces: ReadonlyMap<string, readonly ESTree.TSInterfaceDeclaration[]>;
  readonly shadowedBuiltIns: ReadonlySet<string>;
};

function declaredStatement(statement: ESTree.Statement): ESTree.Node | null {
  return statement.type === "ExportNamedDeclaration" ||
    statement.type === "ExportDefaultDeclaration"
    ? (statement.declaration ?? null)
    : statement;
}

function addImportBindings(
  declaration: ESTree.ImportDeclaration,
  shadowedBuiltIns: Set<string>,
): void {
  for (const specifier of declaration.specifiers) {
    if (BUILT_INS.has(specifier.local.name)) {
      shadowedBuiltIns.add(specifier.local.name);
    }
  }
}

function addTypeAlias(declaration: ESTree.TSTypeAliasDeclaration, maps: TypeEnvironmentMaps): void {
  const existing = maps.aliases.get(declaration.id.name);
  if (existing === undefined) {
    maps.aliases.set(declaration.id.name, declaration);
  } else {
    maps.shadowedBuiltIns.add(declaration.id.name);
  }
  if (BUILT_INS.has(declaration.id.name)) {
    maps.shadowedBuiltIns.add(declaration.id.name);
  }
}

function addInterface(
  declaration: ESTree.TSInterfaceDeclaration,
  interfaces: Map<string, ESTree.TSInterfaceDeclaration[]>,
  shadowedBuiltIns: Set<string>,
): void {
  const declarations = interfaces.get(declaration.id.name) ?? [];
  declarations.push(declaration);
  interfaces.set(declaration.id.name, declarations);
  if (BUILT_INS.has(declaration.id.name)) {
    shadowedBuiltIns.add(declaration.id.name);
  }
}

function addNamedBuiltIn(
  declaration: { readonly id: { readonly name: string } | null },
  shadowedBuiltIns: Set<string>,
): void {
  if (declaration.id !== null && BUILT_INS.has(declaration.id.name)) {
    shadowedBuiltIns.add(declaration.id.name);
  }
}

function addDeclaration(declaration: ESTree.Node | null, maps: TypeEnvironmentMaps): void {
  switch (declaration?.type) {
    case "ImportDeclaration":
      addImportBindings(declaration, maps.shadowedBuiltIns);
      return;
    case "TSTypeAliasDeclaration":
      addTypeAlias(declaration, maps);
      return;
    case "TSInterfaceDeclaration":
      addInterface(declaration, maps.interfaces, maps.shadowedBuiltIns);
      return;
    case "TSEnumDeclaration":
    case "ClassDeclaration":
    case "FunctionDeclaration":
      addNamedBuiltIn(declaration, maps.shadowedBuiltIns);
      return;
    default:
      return;
  }
}

export function createTypeEnvironment(program: ESTree.Program): TypeEnvironment {
  const maps: TypeEnvironmentMaps = {
    aliases: new Map(),
    interfaces: new Map(),
    shadowedBuiltIns: new Set(),
  };

  for (const statement of program.body) {
    addDeclaration(declaredStatement(statement), maps);
  }

  return maps;
}

function typeReferenceName(type: ESTree.TSTypeReference): string | null {
  return type.typeName.type === "Identifier" ? type.typeName.name : null;
}

function isBuiltIn(name: string, environment: TypeEnvironment): boolean {
  return BUILT_INS.has(name) && !environment.shadowedBuiltIns.has(name);
}

function isUnappliedReferenceTo(type: ESTree.TSType, name: string): boolean {
  const unwrapped = unwrapTransparentType(type);
  return (
    unwrapped.type === "TSTypeReference" &&
    typeReferenceName(unwrapped) === name &&
    (unwrapped.typeArguments === null ||
      unwrapped.typeArguments === undefined ||
      unwrapped.typeArguments.params.length === 0)
  );
}

function unwrapTransparentType(type: ESTree.TSType): ESTree.TSType {
  let current = type;
  while (
    current.type === "TSParenthesizedType" ||
    (current.type === "TSTypeOperator" && current.operator === "readonly")
  ) {
    current = current.typeAnnotation;
  }
  return current;
}

function isNeverType(type: ESTree.TSType): boolean {
  return unwrapTransparentType(type).type === "TSNeverKeyword";
}

function isEffectivelyEmptyMember(member: ESTree.TSSignature): boolean {
  return (
    member.type === "TSPropertySignature" &&
    member.optional &&
    member.typeAnnotation !== null &&
    member.typeAnnotation !== undefined &&
    isNeverType(member.typeAnnotation.typeAnnotation)
  );
}

function isEffectivelyEmptyTypeLiteral(type: ESTree.TSTypeLiteral): boolean {
  return type.members.length === 0 || type.members.every(isEffectivelyEmptyMember);
}

function isEffectivelyEmptyInterface(
  declarations: readonly ESTree.TSInterfaceDeclaration[],
): boolean {
  if (declarations.length !== 1) {
    return false;
  }
  const [type] = declarations;
  return (
    type !== undefined &&
    type.extends.length === 0 &&
    (type.body.body.length === 0 || type.body.body.every(isEffectivelyEmptyMember))
  );
}

function resolvedSubstitutionArgument(
  type: ESTree.TSType,
  base: TypeAliasEnvironment,
): ESTree.TSType {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type !== "TSTypeReference") {
    return type;
  }
  const name = typeReferenceName(unwrapped);
  if (name === null) {
    return type;
  }
  const substitution = base.get(name);
  return substitution === undefined ? type : resolvedSubstitutionArgument(substitution, base);
}

function aliasSubstitution(
  alias: ESTree.TSTypeAliasDeclaration,
  type: ESTree.TSTypeReference,
  base: TypeAliasEnvironment,
): TypeAliasEnvironment | null {
  const parameters = alias.typeParameters?.params ?? [];
  const typeArguments = type.typeArguments?.params ?? [];
  const next = new Map(base);
  for (const [index, parameter] of parameters.entries()) {
    const argument = typeArguments[index] ?? parameter.default;
    if (argument === null || argument === undefined) {
      return null;
    }
    next.set(parameter.name.name, resolvedSubstitutionArgument(argument, next));
  }
  return next;
}

function unsafeUnionValue(
  types: readonly ESTree.TSType[],
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): UnsafeDictionary["unsafeValue"] | null {
  return types.some(
    (member) => unsafeDirectValue(member, environment, substitutions, resolvingAliases) !== null,
  )
    ? "union"
    : null;
}

function unsafeIntersectionValue(
  types: readonly ESTree.TSType[],
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): UnsafeDictionary["unsafeValue"] | null {
  const unsafeMembers = types.map((member) =>
    unsafeDirectValue(member, environment, substitutions, resolvingAliases),
  );
  if (unsafeMembers.includes("any")) {
    return "any";
  }
  return unsafeMembers.length > 0 && unsafeMembers.every((member) => member !== null)
    ? unsafeMembers[0]
    : null;
}

function unsafeWrappedReferenceValue(
  type: ESTree.TSTypeReference,
  name: string,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): UnsafeDictionary["unsafeValue"] | null {
  if (!TRANSPARENT_WRAPPERS.has(name) || !isBuiltIn(name, environment)) {
    return null;
  }
  const wrapped = type.typeArguments?.params[0];
  return wrapped === undefined
    ? null
    : unsafeDirectValue(wrapped, environment, substitutions, resolvingAliases);
}

function unsafeAliasReferenceValue(
  type: ESTree.TSTypeReference,
  name: string,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): UnsafeDictionary["unsafeValue"] | null {
  const interfaceDeclarations = environment.interfaces.get(name);
  if (interfaceDeclarations !== undefined) {
    return isEffectivelyEmptyInterface(interfaceDeclarations) ? "empty-object" : null;
  }
  const alias = environment.aliases.get(name);
  if (alias === undefined || resolvingAliases.has(name)) {
    return null;
  }
  const nextSubstitutions = aliasSubstitution(alias, type, substitutions);
  if (nextSubstitutions === null) {
    return null;
  }
  const nextResolving = new Set(resolvingAliases);
  nextResolving.add(name);
  return unsafeDirectValue(alias.typeAnnotation, environment, nextSubstitutions, nextResolving);
}

function unsafeReferenceValue(
  type: ESTree.TSTypeReference,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): UnsafeDictionary["unsafeValue"] | null {
  const name = typeReferenceName(type);
  if (name === null) {
    return null;
  }
  if (TRANSPARENT_WRAPPERS.has(name) && isBuiltIn(name, environment)) {
    return unsafeWrappedReferenceValue(type, name, environment, substitutions, resolvingAliases);
  }
  const substitution = substitutions.get(name);
  if (substitution !== undefined) {
    return isUnappliedReferenceTo(substitution, name)
      ? null
      : unsafeDirectValue(substitution, environment, substitutions, resolvingAliases);
  }
  return unsafeAliasReferenceValue(type, name, environment, substitutions, resolvingAliases);
}

function unsafeDirectValue(
  type: ESTree.TSType,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): UnsafeDictionary["unsafeValue"] | null {
  const unwrapped = unwrapTransparentType(type);
  switch (unwrapped.type) {
    case "TSUnknownKeyword":
      return "unknown";
    case "TSAnyKeyword":
      return "any";
    case "TSObjectKeyword":
      return "object";
    case "TSTypeLiteral":
      return isEffectivelyEmptyTypeLiteral(unwrapped) ? "empty-object" : null;
    case "TSUnionType":
      return unsafeUnionValue(unwrapped.types, environment, substitutions, resolvingAliases);
    case "TSIntersectionType":
      return unsafeIntersectionValue(unwrapped.types, environment, substitutions, resolvingAliases);
    case "TSTypeReference":
      return unsafeReferenceValue(unwrapped, environment, substitutions, resolvingAliases);
    default:
      return null;
  }
}

function dictionaryLiteralValueTypes(
  type: ESTree.TSTypeLiteral,
  substitutions: TypeAliasEnvironment,
): readonly ResolvedType[] {
  return type.members.flatMap((member): readonly ResolvedType[] =>
    member.type === "TSIndexSignature" && member.typeAnnotation !== null
      ? [{ type: member.typeAnnotation.typeAnnotation, substitutions }]
      : [],
  );
}

function dictionarySubstitutionValueTypes(
  name: string,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): readonly ResolvedType[] | null {
  const substitution = substitutions.get(name);
  if (substitution === undefined) {
    return null;
  }
  return isUnappliedReferenceTo(substitution, name)
    ? []
    : dictionaryValueTypes(substitution, environment, substitutions, resolvingAliases);
}

function dictionaryBuiltInValueTypes(
  type: ESTree.TSTypeReference,
  name: string,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): readonly ResolvedType[] | null {
  const wrapped = dictionaryTransparentWrapperValueTypes(
    type,
    name,
    environment,
    substitutions,
    resolvingAliases,
  );
  if (wrapped !== null) {
    return wrapped;
  }
  if (name === "Record" && isBuiltIn(name, environment)) {
    const value = type.typeArguments?.params[1] ?? null;
    return value === null ? [] : [{ type: value, substitutions }];
  }
  if (name === "Pick" || name === "Omit") {
    return dictionarySelectionValueTypes(type, name, environment, substitutions, resolvingAliases);
  }
  return null;
}

function dictionaryTransparentWrapperValueTypes(
  type: ESTree.TSTypeReference,
  name: string,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): readonly ResolvedType[] | null {
  if (!TRANSPARENT_WRAPPERS.has(name) || !isBuiltIn(name, environment)) {
    return null;
  }
  const wrapped = type.typeArguments?.params[0];
  return wrapped === undefined
    ? []
    : dictionaryValueTypes(wrapped, environment, substitutions, resolvingAliases);
}

function dictionarySelectionValueTypes(
  type: ESTree.TSTypeReference,
  name: string,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): readonly ResolvedType[] {
  if (!isBuiltIn(name, environment)) {
    return [];
  }
  const source = type.typeArguments?.params[0];
  return source === undefined
    ? []
    : dictionaryValueTypes(source, environment, substitutions, resolvingAliases);
}

function dictionaryAliasValueTypes(
  type: ESTree.TSTypeReference,
  name: string,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): readonly ResolvedType[] {
  const alias = environment.aliases.get(name);
  if (alias === undefined || resolvingAliases.has(name)) {
    return [];
  }
  const nextSubstitutions = aliasSubstitution(alias, type, substitutions);
  if (nextSubstitutions === null) {
    return [];
  }
  const nextResolving = new Set(resolvingAliases);
  nextResolving.add(name);
  return dictionaryValueTypes(alias.typeAnnotation, environment, nextSubstitutions, nextResolving);
}

function dictionaryReferenceValueTypes(
  type: ESTree.TSTypeReference,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): readonly ResolvedType[] {
  const name = typeReferenceName(type);
  if (name === null) {
    return [];
  }
  const substituted = dictionarySubstitutionValueTypes(
    name,
    environment,
    substitutions,
    resolvingAliases,
  );
  if (substituted !== null) {
    return substituted;
  }
  const builtIn = dictionaryBuiltInValueTypes(
    type,
    name,
    environment,
    substitutions,
    resolvingAliases,
  );
  return (
    builtIn ?? dictionaryAliasValueTypes(type, name, environment, substitutions, resolvingAliases)
  );
}

function dictionaryValueTypes(
  type: ESTree.TSType,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): readonly ResolvedType[] {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type === "TSTypeLiteral") {
    return dictionaryLiteralValueTypes(unwrapped, substitutions);
  }
  if (unwrapped.type === "TSMappedType") {
    return unwrapped.typeAnnotation === null
      ? []
      : [{ type: unwrapped.typeAnnotation, substitutions }];
  }
  return unwrapped.type === "TSTypeReference"
    ? dictionaryReferenceValueTypes(unwrapped, environment, substitutions, resolvingAliases)
    : [];
}

export function classifyUnsafeDictionaryValue(
  valueType: ESTree.TSType,
  environment: TypeEnvironment,
): UnsafeDictionary | null {
  const unsafeValue = unsafeDirectValue(valueType, environment, new Map(), new Set());
  return unsafeValue === null ? null : { kind: "unsafe-dictionary", unsafeValue };
}

export function classifyUnsafeDictionary(
  type: ESTree.TSType,
  environment: TypeEnvironment,
): UnsafeDictionary | null {
  for (const valueType of dictionaryValueTypes(type, environment, new Map(), new Set())) {
    const unsafeValue = unsafeDirectValue(
      valueType.type,
      environment,
      valueType.substitutions,
      new Set(),
    );
    if (unsafeValue !== null) {
      return { kind: "unsafe-dictionary", unsafeValue };
    }
  }
  return null;
}

function resolvesToDictionary(
  type: ESTree.TSType,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): boolean {
  return dictionaryValueTypes(type, environment, substitutions, resolvingAliases).length > 0;
}

function classifyLiteralWideningTarget(type: ESTree.TSTypeLiteral): WideningTarget | null {
  if (type.members.some((member) => member.type === "TSIndexSignature")) {
    return { kind: "open dictionary" };
  }
  return type.members.length > 0 ? { kind: "anonymous object" } : null;
}

function classifyAliasWideningTarget(
  alias: ESTree.TSTypeAliasDeclaration,
  type: ESTree.TSTypeReference,
  environment: TypeEnvironment,
): WideningTarget | null {
  const substitutions = aliasSubstitution(alias, type, new Map());
  if (substitutions === null) {
    return null;
  }
  if ((alias.typeParameters?.params.length ?? 0) > 0) {
    return resolvesToDictionary(
      alias.typeAnnotation,
      environment,
      substitutions,
      new Set([typeReferenceName(type) ?? ""]),
    )
      ? { kind: "generic container" }
      : null;
  }
  const name = typeReferenceName(type);
  if (name === null) {
    return null;
  }
  return classifyAliasBroadTarget(
    alias.typeAnnotation,
    environment,
    substitutions,
    new Set([name]),
  );
}

function classifyReferenceWideningTarget(
  type: ESTree.TSTypeReference,
  environment: TypeEnvironment,
): WideningTarget | null {
  const name = typeReferenceName(type);
  if (name === null) {
    return null;
  }
  if (TRANSPARENT_WRAPPERS.has(name) && isBuiltIn(name, environment)) {
    const wrapped = type.typeArguments?.params[0];
    return wrapped === undefined ? null : classifyWideningTarget(wrapped, environment);
  }
  if (name === "Record" && isBuiltIn(name, environment)) {
    return { kind: "open dictionary" };
  }
  const alias = environment.aliases.get(name);
  return alias === undefined ? null : classifyAliasWideningTarget(alias, type, environment);
}

export function classifyWideningTarget(
  type: ESTree.TSType,
  environment: TypeEnvironment,
): WideningTarget | null {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type === "TSUnknownKeyword") {
    return { kind: "unknown" };
  }
  if (unwrapped.type === "TSObjectKeyword") {
    return { kind: "object" };
  }
  if (unwrapped.type === "TSTypeLiteral") {
    return classifyLiteralWideningTarget(unwrapped);
  }
  if (unwrapped.type === "TSMappedType") {
    return { kind: "open dictionary" };
  }
  return unwrapped.type === "TSTypeReference"
    ? classifyReferenceWideningTarget(unwrapped, environment)
    : null;
}

function classifyAliasBroadTarget(
  type: ESTree.TSType,
  environment: TypeEnvironment,
  substitutions: TypeAliasEnvironment,
  resolvingAliases: ReadonlySet<string>,
): WideningTarget | null {
  const unwrapped = unwrapTransparentType(type);
  if (unwrapped.type === "TSUnknownKeyword") {
    return { kind: "unknown" };
  }
  if (unwrapped.type === "TSObjectKeyword") {
    return { kind: "object" };
  }
  if (unwrapped.type !== "TSTypeReference") {
    return null;
  }
  const name = typeReferenceName(unwrapped);
  if (name === null) {
    return null;
  }
  const substitution = substitutions.get(name);
  if (substitution !== undefined) {
    return classifyAliasBroadTarget(substitution, environment, substitutions, resolvingAliases);
  }
  const alias = environment.aliases.get(name);
  if (alias === undefined || resolvingAliases.has(name)) {
    return null;
  }
  const nextSubstitutions = aliasSubstitution(alias, unwrapped, substitutions);
  if (nextSubstitutions === null) {
    return null;
  }
  const nextResolving = new Set(resolvingAliases);
  nextResolving.add(name);
  return classifyAliasBroadTarget(
    alias.typeAnnotation,
    environment,
    nextSubstitutions,
    nextResolving,
  );
}

export function isPopulatedObjectExpression(expression: ESTree.Expression): boolean {
  let current = expression;
  while (
    current.type === "ParenthesizedExpression" ||
    current.type === "TSAsExpression" ||
    current.type === "TSTypeAssertion" ||
    current.type === "TSNonNullExpression"
  ) {
    current = current.expression;
  }
  return current.type === "ObjectExpression" && current.properties.length > 0;
}

const evidenceWrapperTypes = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSTypeAssertion",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
]);

const knownEvidenceTypes = new Set([
  "ArrayExpression",
  "ArrowFunctionExpression",
  "ClassExpression",
  "FunctionExpression",
  "NewExpression",
  "Literal",
  "TemplateLiteral",
  "UnaryExpression",
]);

function isEvidenceWrapper(
  expression: ESTree.Expression,
): expression is ESTree.Expression & { readonly expression: ESTree.Expression } {
  return evidenceWrapperTypes.has(expression.type);
}

export function isKnownEvidenceExpression(expression: ESTree.Expression): boolean {
  let current = expression;
  while (isEvidenceWrapper(current)) {
    current = current.expression;
  }
  if (current.type === "ObjectExpression") {
    return true;
  }
  return knownEvidenceTypes.has(current.type);
}
