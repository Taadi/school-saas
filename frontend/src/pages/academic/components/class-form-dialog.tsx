import { useEffect, useState } from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { CLASS_LEVELS, ClassPayload, classesApi } from '@/services/academic';
import { ClassLevel, SchoolClass } from '@/types/school';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  schoolClass?: SchoolClass | null;
  onSaved(): void;
}

export function ClassFormDialog({ open, onOpenChange, schoolClass, onSaved }: Props) {
  const isEdit = Boolean(schoolClass);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ClassPayload>({
    name: '',
    level: 'junior_secondary',
    order: 0,
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: schoolClass?.name ?? '',
        level: schoolClass?.level ?? 'junior_secondary',
        order: schoolClass?.order ?? 0,
      });
    }
  }, [open, schoolClass]);

  async function submit() {
    if (!form.name.trim()) {
      toast.error('Class name is required.');
      return;
    }
    try {
      setSubmitting(true);
      if (isEdit && schoolClass) {
        await classesApi.update(schoolClass.id, form);
        toast.success(`${form.name} updated.`);
      } else {
        await classesApi.create(form);
        toast.success(`${form.name} created.`);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not save class.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Class' : 'New Class'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="class-name">Name</Label>
            <Input
              id="class-name"
              placeholder="e.g. JSS1, Primary 4, SSS3"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Level</Label>
            <Select
              value={form.level}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, level: v as ClassLevel }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASS_LEVELS.map((lvl) => (
                  <SelectItem key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="class-order">Display order</Label>
            <Input
              id="class-order"
              type="number"
              min={0}
              max={100}
              value={form.order ?? 0}
              onChange={(e) =>
                setForm((f) => ({ ...f, order: Number(e.target.value) }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Lower numbers sort first (Primary 1 = 1, JSS1 = 7, SSS3 = 12).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <LoaderCircleIcon className="size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create class'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
