function encodeEmail(email: string): string {
  function y(s: string) {
    return s.replace(/[a-zA-Z]/g, (c: string) => {
      const charCode = c.charCodeAt(0);
      const shift = (charCode <= 90 ? 90 : 122) >= charCode + 13 ? 13 : -13;
      return String.fromCharCode(charCode + shift);
    });
  }

  const [localPart, domain] = email.split("@");
  const [domainName, tld] = domain.split(".");

  const encodedLocalPart = btoa(localPart);
  const encodedDomainName = y(btoa(domainName));

  return `${encodedLocalPart}@${encodedDomainName}.${tld}`;
}
