import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@jfa.dev/common/ui";

import { Row, Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function DialogSection() {
  return (
    <Section
      description="Aria Modal. DialogTrigger wraps the opener and the Dialog. Close with Esc, the overlay, or a footer action."
      id="dialog"
      title="Dialog"
    >
      <Specimen label="Confirm">
        <Row>
          <DialogTrigger>
            <Button variant="outline">Delete list</Button>
            <Dialog>
              <DialogHeader>
                <DialogTitle>Delete Weekend groceries?</DialogTitle>
                <DialogDescription>
                  This list and its items are removed. You cannot undo this.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button slot="close" variant="outline">
                  Cancel
                </Button>
                <Button slot="close" variant="destructive">
                  Delete list
                </Button>
              </DialogFooter>
            </Dialog>
          </DialogTrigger>
        </Row>
      </Specimen>
      <Specimen label="No close button">
        <Row>
          <DialogTrigger>
            <Button variant="secondary">List gone</Button>
            <Dialog showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>This list no longer exists</DialogTitle>
                <DialogDescription>
                  It was deleted or the alias stopped resolving.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button slot="close" variant="outline">
                  Back to lists
                </Button>
              </DialogFooter>
            </Dialog>
          </DialogTrigger>
        </Row>
      </Specimen>
    </Section>
  );
}
