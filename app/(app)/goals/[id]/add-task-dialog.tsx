'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTask } from '@/app/actions';

export function AddTaskDialog({ goalId }: { goalId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const res = await createTask(fd);
      if (!('error' in res)) {
        formRef.current?.reset();
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        Розбити на кроки
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md bg-background rounded-2xl shadow-2xl border p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">Новий крок</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="goal_id" value={goalId} />

              <div className="space-y-1.5">
                <Label htmlFor="specific" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Що конкретно зробити?
                </Label>
                <Input
                  id="specific"
                  name="specific"
                  placeholder="Наприклад: пробігти 3 км"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="action" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Як / яким чином?
                </Label>
                <Input
                  id="action"
                  name="action"
                  placeholder="Наприклад: вийти в парк о 7 ранку"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="result" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Який результат?
                </Label>
                <Input
                  id="result"
                  name="result"
                  placeholder="Наприклад: фіксую час у додатку"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Дедлайн
                </Label>
                <Input id="deadline" name="deadline" type="date" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Скасувати
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? 'Зберігаю…' : 'Додати крок'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
