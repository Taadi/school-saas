import { useEffect, useState } from 'react';
import { LoaderCircleIcon, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { TERM_LABELS } from '@/services/academic';
import { subTermsApi } from '@/services/sub-terms';
import { SubTerm } from '@/types/school';
import { ReportConfigBundle } from '../use-report-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SubTermsTab({ config }: { config: ReportConfigBundle }) {
  const [termId, setTermId] = useState('');
  const [items, setItems] = useState<SubTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const allTerms = config.sessions.flatMap((s) => (s.terms ?? []).map((t) => ({ ...t, sessionName: s.name })));
  useEffect(() => { const c = allTerms.find((t) => t.is_current) ?? allTerms[0]; if (c && !termId) setTermId(String(c.id)); }, [allTerms, termId]);
  useEffect(() => { if (!termId) return; setLoading(true); subTermsApi.list(Number(termId)).then((r) => setItems(r.data)).finally(() => setLoading(false)); }, [termId]);
  async function seed() { if (!termId) return; try { await subTermsApi.seedForTerm(Number(termId)); toast.success('Mid-term ensured.'); setItems((await subTermsApi.list(Number(termId))).data); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Failed'); } }
  async function add() { if (!termId || !name.trim()) return; try { await subTermsApi.create({ term_id: Number(termId), name: name.trim(), kind: 'custom' }); setName(''); setItems((await subTermsApi.list(Number(termId))).data); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Failed'); } }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Sub-terms (Mid-term etc.) drive separate score entry and report cards. Create schemes under Assessment with applies_to = sub_term.</p>
      <Card><CardContent className="pt-4 flex flex-wrap gap-3 items-end">
        <div className="grid gap-1.5 min-w-[200px]"><Label className="text-xs">Term</Label>
        <Select value={termId} onValueChange={setTermId}><SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{allTerms.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.sessionName} - {TERM_LABELS[t.name]}</SelectItem>)}</SelectContent></Select></div>
        <Button variant="outline" onClick={seed} disabled={!termId}><Sparkles className="size-4" />Ensure mid-term</Button>
      </CardContent></Card>
      <Card><CardHeader><CardHeading>Sub-terms</CardHeading></CardHeader><CardContent className="space-y-2">
        {loading ? <LoaderCircleIcon className="animate-spin size-4" /> : items.map((st) => (
          <div key={st.id} className="flex justify-between border rounded px-3 py-2"><span>{st.name} ({st.kind})</span>
          <Button variant="ghost" size="sm" onClick={() => subTermsApi.remove(st.id).then(() => setItems(items.filter(i => i.id !== st.id)))}><Trash2 className="size-4" /></Button></div>
        ))}
        <div className="flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /><Button onClick={add}><Plus className="size-4" /></Button></div>
      </CardContent></Card>
    </div>
  );
}
