import {
  Checkbox,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@jfa.dev/common/ui";

import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function TableSection() {
  return (
    <Section
      description="Plain table primitives with overflow on the container. Header, body, footer, and caption slots."
      id="table"
      title="Table"
    >
      <Specimen label="Shopping list">
        <div className="w-full overflow-x-auto">
          <Table className="tabular-nums">
            <TableCaption>Weekend groceries</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Oat milk</TableCell>
                <TableCell className="text-right">2</TableCell>
                <TableCell>l</TableCell>
                <TableCell>Dairy</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Sourdough</TableCell>
                <TableCell className="text-right">1</TableCell>
                <TableCell>loaf</TableCell>
                <TableCell>Bakery</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Blood oranges</TableCell>
                <TableCell className="text-right">6</TableCell>
                <TableCell>ea</TableCell>
                <TableCell>Produce</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Items</TableCell>
                <TableCell>3</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Specimen>
      <Specimen label="With checkboxes">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox aria-label="Select all" />
                </TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Checkbox aria-label="Select oat milk" defaultSelected />
                </TableCell>
                <TableCell className="font-medium">Oat milk</TableCell>
                <TableCell className="text-right tabular-nums">2</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Checkbox aria-label="Select sourdough" />
                </TableCell>
                <TableCell className="font-medium">Sourdough</TableCell>
                <TableCell className="text-right tabular-nums">1</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Specimen>
    </Section>
  );
}
