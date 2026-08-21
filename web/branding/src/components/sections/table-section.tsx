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

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function TableSection() {
  return (
    <Section
      description="Plain table primitives with container overflow. Header / body / footer / caption slots."
      id="table"
      title="Table"
    >
      <Card>
        <Preview>
          <div className="w-full">
            <Table>
              <TableCaption>Invoices — demo data.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">INV001</TableCell>
                  <TableCell>Paid</TableCell>
                  <TableCell>Card</TableCell>
                  <TableCell className="text-right">$250.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">INV002</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>PayPal</TableCell>
                  <TableCell className="text-right">$150.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">INV003</TableCell>
                  <TableCell>Unpaid</TableCell>
                  <TableCell>Transfer</TableCell>
                  <TableCell className="text-right">$350.00</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">$750.00</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </Preview>
        <Preview label="with checkboxes">
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox aria-label="Select all" />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Checkbox aria-label="Select Ada" defaultSelected />
                  </TableCell>
                  <TableCell className="font-medium">Ada</TableCell>
                  <TableCell className="text-right">42</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Checkbox aria-label="Select Bob" />
                  </TableCell>
                  <TableCell className="font-medium">Bob</TableCell>
                  <TableCell className="text-right">27</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Preview>
      </Card>
    </Section>
  );
}
