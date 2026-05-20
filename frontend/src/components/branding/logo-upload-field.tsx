import { useRef } from 'react';
import { ImagePlus, LoaderCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type LogoUploadFieldProps = {
  label: string;
  url: string | null;
  busy?: boolean;
  disabled?: boolean;
  hint?: string;
  onPick: (file: File) => void;
  onClear: () => void;
};

export function LogoUploadField({
  label,
  url,
  busy = false,
  disabled = false,
  hint,
  onPick,
  onClear,
}: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex items-center gap-3">
        <div className="size-20 border rounded-md overflow-hidden flex items-center justify-center bg-muted/30">
          {url ? (
            <img src={url} alt={label} className="max-w-full max-h-full object-contain" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy && <LoaderCircleIcon className="size-4 animate-spin" />}
          {url ? 'Replace' : 'Upload'}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || busy}
            onClick={onClear}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
