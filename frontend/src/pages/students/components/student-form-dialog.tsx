import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { studentsApi, referenceApi } from '@/services/students';
import { Arm, SchoolClass, Student, StudentPayload } from '@/types/school';
import { ApiError } from '@/lib/api';
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
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircleIcon } from 'lucide-react';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
  'Zamfara',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Sibling', 'Other'];

type FormValues = StudentPayload;

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  student?: Student | null;
  classes: SchoolClass[];
  onSaved(): void;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
  classes,
  onSaved,
}: Props) {
  const isEdit = Boolean(student);
  const [arms, setArms] = useState<Arm[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: getDefaults(student),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaults(student));
    }
  }, [open, student, form]);

  const watchedClass = form.watch('school_class_id');

  useEffect(() => {
    if (!watchedClass) {
      setArms([]);
      return;
    }
    referenceApi
      .arms(Number(watchedClass))
      .then((r) => setArms(r.data))
      .catch(() => setArms([]));
  }, [watchedClass]);

  async function onSubmit(values: FormValues) {
    try {
      setSubmitting(true);

      const payload: StudentPayload = {
        ...values,
        school_class_id: values.school_class_id
          ? Number(values.school_class_id)
          : null,
        arm_id: values.arm_id ? Number(values.arm_id) : null,
      };

      if (isEdit && student) {
        await studentsApi.update(student.id, payload);
        toast.success('Student updated.');
      } else {
        await studentsApi.create(payload);
        toast.success('Student created.');
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? Object.values(err.errors ?? {})
              .flat()
              .join('\n') || err.message
          : 'Could not save student.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1"
        >
          <Field label="Full Name" required>
            <Input {...form.register('name', { required: true })} placeholder="e.g. Adaeze Okafor" />
          </Field>

          <Field label="Email (optional)">
            <Input type="email" {...form.register('email')} placeholder="student@example.com" />
          </Field>

          <Field label="Date of Birth">
            <Input type="date" {...form.register('date_of_birth')} />
          </Field>

          <Field label="Gender">
            <SelectField
              value={form.watch('gender') ?? ''}
              onChange={(v) => form.setValue('gender', (v || null) as 'male' | 'female' | null)}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
              placeholder="Select gender"
            />
          </Field>

          <Field label="Religion">
            <Input {...form.register('religion')} placeholder="e.g. Christianity / Islam" />
          </Field>

          <Field label="State of Origin">
            <SelectField
              value={form.watch('state_of_origin') ?? ''}
              onChange={(v) => form.setValue('state_of_origin', v || null)}
              options={NIGERIAN_STATES.map((s) => ({ value: s, label: s }))}
              placeholder="Select state"
            />
          </Field>

          <Field label="LGA">
            <Input {...form.register('lga')} placeholder="Local government area" />
          </Field>

          <Field label="Blood Group">
            <SelectField
              value={form.watch('blood_group') ?? ''}
              onChange={(v) => form.setValue('blood_group', v || null)}
              options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
              placeholder="Select"
            />
          </Field>

          <Field label="Address" className="md:col-span-2">
            <Textarea
              {...form.register('address')}
              rows={2}
              placeholder="Home address"
            />
          </Field>

          <div className="md:col-span-2 mt-2">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Guardian / Parent
            </h3>
          </div>

          <Field label="Guardian Name">
            <Input {...form.register('guardian_name')} placeholder="Full name" />
          </Field>

          <Field label="Relationship">
            <SelectField
              value={form.watch('guardian_relationship') ?? ''}
              onChange={(v) => form.setValue('guardian_relationship', v || null)}
              options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
              placeholder="Select"
            />
          </Field>

          <Field label="Guardian Phone">
            <Input {...form.register('guardian_phone')} placeholder="+234..." />
          </Field>

          <Field label="Guardian Email">
            <Input type="email" {...form.register('guardian_email')} placeholder="guardian@example.com" />
          </Field>

          <div className="md:col-span-2 mt-2">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Class Assignment
            </h3>
          </div>

          <Field label="Class">
            <SelectField
              value={
                form.watch('school_class_id')
                  ? String(form.watch('school_class_id'))
                  : ''
              }
              onChange={(v) => {
                form.setValue('school_class_id', v ? Number(v) : null);
                form.setValue('arm_id', null);
              }}
              options={classes.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
              placeholder="Select class"
            />
          </Field>

          <Field label="Arm">
            <SelectField
              value={form.watch('arm_id') ? String(form.watch('arm_id')) : ''}
              onChange={(v) => form.setValue('arm_id', v ? Number(v) : null)}
              options={arms.map((a) => ({ value: String(a.id), label: a.name }))}
              placeholder={watchedClass ? (arms.length ? 'Select arm' : 'No arms — add one first') : 'Select class first'}
              disabled={!watchedClass || arms.length === 0}
            />
          </Field>

          <DialogFooter className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Student'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getDefaults(student?: Student | null): FormValues {
  if (!student) {
    return {
      name: '',
      email: '',
      date_of_birth: null,
      gender: null,
      religion: null,
      state_of_origin: null,
      lga: null,
      address: null,
      guardian_name: null,
      guardian_phone: null,
      guardian_email: null,
      guardian_relationship: null,
      blood_group: null,
      admitted_on: null,
      status: 'active',
      school_class_id: null,
      arm_id: null,
    };
  }

  return {
    name: student.name,
    email: student.email,
    date_of_birth: student.date_of_birth,
    gender: student.gender,
    religion: student.religion,
    state_of_origin: student.state_of_origin,
    lga: student.lga,
    address: student.address,
    guardian_name: student.guardian_name,
    guardian_phone: student.guardian_phone,
    guardian_email: student.guardian_email,
    guardian_relationship: student.guardian_relationship,
    blood_group: student.blood_group,
    admitted_on: student.admitted_on,
    status: student.status,
    school_class_id: student.current_class?.school_class_id ?? null,
    arm_id: student.current_class?.arm_id ?? null,
  };
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange(v: string): void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
