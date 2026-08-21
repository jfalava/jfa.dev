import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@jfa.dev/common/ui";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function DialogSection() {
  return (
    <Section
      description="Aria Modal overlay. DialogTrigger wraps the trigger and the Dialog (which renders its own overlay + modal)."
      id="dialog"
      title="Dialog"
    >
      <Card>
        <Preview label="example">
          <DialogTrigger>
            <Button variant="outline">Open dialog</Button>
            <Dialog>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This will permanently showcase the dialog component. You can close with Esc, the ×
                  button, or clicking outside.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                Dialog body — put forms, confirmations, or any content here.
              </div>
              <DialogFooter>
                <Button slot="close" variant="outline">
                  Cancel
                </Button>
                <Button slot="close">Confirm</Button>
              </DialogFooter>
            </Dialog>
          </DialogTrigger>
        </Preview>
        <Preview label="without close button">
          <DialogTrigger>
            <Button variant="secondary">Open (no ×)</Button>
            <Dialog showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>Heads up</DialogTitle>
                <DialogDescription>Close only via the footer or overlay.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button slot="close" variant="outline">
                  Got it
                </Button>
              </DialogFooter>
            </Dialog>
          </DialogTrigger>
        </Preview>
      </Card>
    </Section>
  );
}
