import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { teachersApi, teacherPhotoUrl } from '@/services/teachers';
import { ApiError } from '@/lib/api';
import { Teacher, TeacherPayload } from '@/types/school';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
  'Zamfara',
];

const RELATIONSHIPS = [
  'Spouse', 'Father', 'Mother', 'Sibling', 'Friend', 'Other',
];

const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];

type FormValues = TeacherPayload;

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  teacher?: Teacher | null;
  onSaved(teacher: Teacher): void;
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
  onSaved,
}: Props) {
  const isEdit = Boolean(teacher);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('personal');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    defaultValues: getDefaults(teacher),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaults(teacher));
      setTab('personal');
      setPhotoFile(null);
    }
  }, [open, teacher, form]);

  async function onSubmit(values: FormValues) {
    try {
      setSubmitting(true);

      const payload: TeacherPayload = {
        ...values,
        years_of_experience: values.years_of_experience
          ? Number(values.years_of_experience)
          : null,
        salary_amount: values.salary_amount ? Number(values.salary_amount) : null,
      };

      let saved: Teacher;
      if (isEdit && teacher) {
        const res = await teachersApi.update(teacher.id, payload);
        saved = res.data;
        toast.success('Teacher updated.');
      } else {
        const res = await teachersApi.create(payload);
        saved = res.data;

        if (saved.temporary_password) {
          toast.success(
            `Teacher created. Login: ${saved.email} / ${saved.temporary_password}`,
            { duration: 12_000 },
          );
        } else {
          toast.success('Teacher created.');
        }
      }

      // Optional: upload selected photo right after save.
      if (photoFile) {
        try {
          const up = await teachersApi.uploadPhoto(saved.id, photoFile);
          saved = { ...saved, passport_photo: up.passport_photo };
        } catch (err) {
          toast.warning(
            err instanceof ApiError ? err.message : 'Photo upload failed.',
          );
        }
      }

      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? Object.values(err.errors ?? {}).flat().join('\n') || err.message
          : 'Could not save teacher.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="bank">Bank</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* ----- Personal ----- */}
            <TabsContent value="personal" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-1">
                <Field label="Full Name" required>
                  <Input
                    {...form.register('name', { required: true })}
                    placeholder="e.g. Mr. Tunde Bakare"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    {...form.register('email')}
                    placeholder="teacher@example.com"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    {...form.register('phone')}
                    placeholder="+234..."
                  />
                </Field>
                <Field label="Secondary Phone">
                  <Input
                    {...form.register('phone_secondary')}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Date of Birth">
                  <Input type="date" {...form.register('date_of_birth')} />
                </Field>
                <Field label="Gender">
                  <SelectField
                    value={form.watch('gender') ?? ''}
                    onChange={(v) =>
                      form.setValue('gender', (v || null) as 'male' | 'female' | null)
                    }
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                    ]}
                    placeholder="Select gender"
                  />
                </Field>
                <Field label="Marital Status">
                  <SelectField
                    value={form.watch('marital_status') ?? ''}
                    onChange={(v) => form.setValue('marital_status', v || null)}
                    options={MARITAL_STATUSES.map((s) => ({ value: s, label: s }))}
                    placeholder="Select"
                  />
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
                <Field label="Address" className="md:col-span-2">
                  <Textarea
                    {...form.register('address')}
                    rows={2}
                    placeholder="Home address"
                  />
                </Field>

                <div className="md:col-span-2 mt-2">
                  <h4 className="text-sm font-semibold mb-2">Next of Kin</h4>
                </div>
                <Field label="Name">
                  <Input {...form.register('next_of_kin_name')} placeholder="Full name" />
                </Field>
                <Field label="Phone">
                  <Input {...form.register('next_of_kin_phone')} placeholder="+234..." />
                </Field>
                <Field label="Relationship">
                  <SelectField
                    value={form.watch('next_of_kin_relationship') ?? ''}
                    onChange={(v) => form.setValue('next_of_kin_relationship', v || null)}
                    options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
                    placeholder="Select"
                  />
                </Field>
              </div>
            </TabsContent>

            {/* ----- Employment ----- */}
            <TabsContent value="employment" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-1">
                <Field label="Qualification">
                  <Input
                    {...form.register('qualification')}
                    placeholder="e.g. B.Ed Mathematics, PGDE"
                  />
                </Field>
                <Field label="Years of Experience">
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    {...form.register('years_of_experience')}
                    placeholder="e.g. 5"
                  />
                </Field>
                <Field label="Subject Specialization" className="md:col-span-2">
                  <Input
                    {...form.register('subject_specialization')}
                    placeholder="e.g. Mathematics, Further Maths"
                  />
                </Field>
                <Field label="Date Employed">
                  <Input type="date" {...form.register('date_employed')} />
                </Field>
                <Field label="Status">
                  <SelectField
                    value={form.watch('status') ?? 'active'}
                    onChange={(v) =>
                      form.setValue('status', v as TeacherPayload['status'])
                    }
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'on_leave', label: 'On leave' },
                      { value: 'resigned', label: 'Resigned' },
                    ]}
                    placeholder="Status"
                  />
                </Field>
                <Field label="Salary (₦)" className="md:col-span-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...form.register('salary_amount')}
                    placeholder="e.g. 180000"
                  />
                </Field>
              </div>
            </TabsContent>

            {/* ----- Bank ----- */}
            <TabsContent value="bank" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Bank Name">
                  <Input
                    {...form.register('bank_name')}
                    placeholder="e.g. GTBank"
                  />
                </Field>
                <Field label="Account Number">
                  <Input
                    {...form.register('account_number')}
                    placeholder="10-digit NUBAN"
                  />
                </Field>
                <Field label="Account Name" className="md:col-span-2">
                  <Input
                    {...form.register('account_name')}
                    placeholder="As registered with the bank"
                  />
                </Field>
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Used for salary disbursement records. Encrypt or restrict
                  database access for production deployments.
                </p>
              </div>
            </TabsContent>

            {/* ----- Documents ----- */}
            <TabsContent value="documents" className="mt-4">
              <div className="grid gap-4">
                <Field label="Passport Photo">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setPhotoFile(e.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. JPG / PNG up to 2MB. Uploaded after the teacher
                    record is saved.
                  </p>
                </Field>

                {(photoFile || teacher?.passport_photo) && (
                  <div className="rounded-md border p-3 flex items-center gap-3">
                    <img
                      src={
                        photoFile
                          ? URL.createObjectURL(photoFile)
                          : (teacherPhotoUrl(teacher?.passport_photo) ?? '')
                      }
                      alt="Passport"
                      className="size-16 rounded-md object-cover bg-muted"
                    />
                    <div className="text-sm">
                      <div className="font-medium">
                        {photoFile ? photoFile.name : 'Current passport photo'}
                      </div>
                      {photoFile && (
                        <div className="text-xs text-muted-foreground">
                          Will replace existing photo on save.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
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
                'Create Teacher'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getDefaults(teacher?: Teacher | null): FormValues {
  if (!teacher) {
    return {
      name: '',
      email: null,
      phone: null,
      qualification: null,
      years_of_experience: null,
      subject_specialization: null,
      date_employed: new Date().toISOString().slice(0, 10),
      salary_amount: null,
      bank_name: null,
      account_number: null,
      account_name: null,
      date_of_birth: null,
      gender: null,
      marital_status: null,
      phone_secondary: null,
      address: null,
      state_of_origin: null,
      lga: null,
      next_of_kin_name: null,
      next_of_kin_phone: null,
      next_of_kin_relationship: null,
      passport_photo: null,
      status: 'active',
    };
  }

  return {
    name: teacher.name ?? '',
    email: teacher.email,
    phone: teacher.phone,
    qualification: teacher.qualification,
    years_of_experience: teacher.years_of_experience,
    subject_specialization: teacher.subject_specialization,
    date_employed: teacher.date_employed,
    salary_amount: teacher.salary_amount,
    bank_name: teacher.bank_name,
    account_number: teacher.account_number,
    account_name: teacher.account_name,
    date_of_birth: teacher.date_of_birth,
    gender: teacher.gender,
    marital_status: teacher.marital_status,
    phone_secondary: teacher.phone_secondary,
    address: teacher.address,
    state_of_origin: teacher.state_of_origin,
    lga: teacher.lga,
    next_of_kin_name: teacher.next_of_kin_name,
    next_of_kin_phone: teacher.next_of_kin_phone,
    next_of_kin_relationship: teacher.next_of_kin_relationship,
    passport_photo: teacher.passport_photo,
    status: teacher.status,
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
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
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
