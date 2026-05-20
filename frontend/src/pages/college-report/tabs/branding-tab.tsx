import { useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircleIcon, Save, Stamp } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { collegeReportApi } from '@/services/college-report';
import { ReportSettings } from '@/types/school';
import { ReportConfigBundle } from '../use-report-config';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type B = ReportSettings['branding'];

const EMPTY: B = {
  motto: '',
  seal_url: '',
  sponsor_name: '',
  proprietor_name: '',
  principal_name: '',
  signature_url: '',
};

/**
 * Tab 9 — School Motto, Seal & Sponsor. Drives the report-card header band.
 */
export function BrandingTab({ config }: { config: ReportConfigBundle }) {
  const [b, setB] = useState<B>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyKind, setBusyKind] = useState<'seal' | 'signature' | null>(null);
  const sealRef = useRef<HTMLInputElement | null>(null);
  const sigRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (config.settings) {
      setB({ ...EMPTY, ...config.settings.branding });
    }
  }, [config.settings]);

  async function save() {
    try {
      setSaving(true);
      await collegeReportApi.updateSettings({
        branding: {
          motto: b.motto?.trim() || null,
          seal_url: b.seal_url || null,
          sponsor_name: b.sponsor_name?.trim() || null,
          proprietor_name: b.proprietor_name?.trim() || null,
          principal_name: b.principal_name?.trim() || null,
          signature_url: b.signature_url || null,
        },
      });
      toast.success('Branding saved.');
      await config.refreshSection('settings');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function upload(kind: 'seal' | 'signature', file: File) {
    try {
      setBusyKind(kind);
      const r = await collegeReportApi.uploadBrandingAsset(kind, file);
      toast.success('Image uploaded.');
      setB({
        ...b,
        ...(kind === 'seal' ? { seal_url: r.url } : { signature_url: r.url }),
      });
      await config.refreshSection('settings');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <span className="font-medium flex items-center gap-2">
            <Stamp className="size-4 text-muted-foreground" />
            School branding
          </span>
        </CardHeading>
        <Button onClick={save} disabled={saving}>
          {saving && <LoaderCircleIcon className="size-4 animate-spin" />}
          <Save className="size-4" />
          Save
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Motto</Label>
          <Textarea
            rows={2}
            value={b.motto ?? ''}
            onChange={(e) => setB({ ...b, motto: e.target.value })}
            placeholder="Knowledge, Discipline, Service"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Sponsor / Proprietor name</Label>
            <Input
              value={b.proprietor_name ?? ''}
              onChange={(e) => setB({ ...b, proprietor_name: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Sponsor (e.g. Diocese)</Label>
            <Input
              value={b.sponsor_name ?? ''}
              onChange={(e) => setB({ ...b, sponsor_name: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Principal name</Label>
            <Input
              value={b.principal_name ?? ''}
              onChange={(e) => setB({ ...b, principal_name: e.target.value })}
            />
          </div>
        </div>

        <AssetField
          label="School seal / logo"
          url={b.seal_url ?? ''}
          busy={busyKind === 'seal'}
          inputRef={sealRef}
          onPick={(file) => upload('seal', file)}
          onClear={() => setB({ ...b, seal_url: '' })}
        />
        <AssetField
          label="Principal signature"
          url={b.signature_url ?? ''}
          busy={busyKind === 'signature'}
          inputRef={sigRef}
          onPick={(file) => upload('signature', file)}
          onClear={() => setB({ ...b, signature_url: '' })}
        />
      </CardContent>
    </Card>
  );
}

function AssetField({
  label,
  url,
  busy,
  inputRef,
  onPick,
  onClear,
}: {
  label: string;
  url: string;
  busy: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="size-20 border rounded-md overflow-hidden flex items-center justify-center bg-muted/30">
          {url ? (
            <img src={url} alt={label} className="max-w-full max-h-full" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = '';
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy && <LoaderCircleIcon className="size-4 animate-spin" />}
          {url ? 'Replace' : 'Upload'}
        </Button>
        {url && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
