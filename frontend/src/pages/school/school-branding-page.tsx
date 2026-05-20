import { Fragment, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { brandingApi } from '@/services/branding';
import { LogoUploadField } from '@/components/branding/logo-upload-field';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { useBranding } from '@/providers/branding-provider';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
} from '@/components/ui/card';

export function SchoolBrandingPage() {
  const {
    school_logo_url,
    platform_logo_url,
    effective_logo_url,
    refresh,
  } = useBranding();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    try {
      setBusy(true);
      await brandingApi.uploadSchoolLogo(file);
      await refresh();
      toast.success('School logo updated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      setBusy(true);
      await brandingApi.removeSchoolLogo();
      await refresh();
      toast.success('School logo removed. Platform logo is used instead.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove logo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="School Branding"
            description="Your school logo in the sidebar and header. Leave empty to use the platform default."
          />
        </Toolbar>
      </Container>

      <Container>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardHeading>
              <span className="font-medium flex items-center gap-2">
                <ImageIcon className="size-4 text-muted-foreground" />
                App logo
              </span>
            </CardHeading>
          </CardHeader>
          <CardContent className="grid gap-6">
            <LogoUploadField
              label="School logo"
              url={school_logo_url}
              busy={busy}
              hint="PNG or JPG, max 2 MB. Shown to staff and students signed in to your school."
              onPick={upload}
              onClear={remove}
            />

            <div className="rounded-lg border bg-muted/20 p-4 grid gap-2 text-sm">
              <p className="font-medium">Preview</p>
              <div className="flex items-center gap-4">
                <img
                  src={effective_logo_url ?? platform_logo_url ?? ''}
                  alt="Current app logo"
                  className="h-8 max-w-[160px] object-contain"
                />
                <span className="text-muted-foreground">
                  {school_logo_url
                    ? 'Using your school logo.'
                    : platform_logo_url
                      ? 'Using the platform default (no school logo set).'
                      : 'Using the built-in default until a logo is uploaded.'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}
