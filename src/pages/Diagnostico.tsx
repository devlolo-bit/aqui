import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, collection, formatDateTime, useAuth } from '@/lib/fab-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from '@/components/ui/sonner';

type Assessment = {
  id: string;
  owner_id?: string;
  status?: string;
  created_at?: string;
};

export default function Diagnostico() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [items, setItems] = useState<Assessment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      setItems([]);
      return;
    }
    let active = true;
    collection<Assessment>('assessment')
      .list({ sort: '-created_at' })
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((e: unknown) => {
        if (active) {
          setError(e instanceof ApiError ? e.message : 'Não foi possível carregar os diagnósticos. Tente novamente.');
        }
      });
    return () => {
      active = false;
    };
  }, [isLoggedIn, isLoading]);

  async function start() {
    if (!user) return;
    setCreating(true);
    try {
      const created = await collection<Assessment>('assessment').create({
        owner_id: user.id,
        status: 'em andamento',
        created_at: new Date().toISOString(),
      });
      setItems((prev) => [created, ...(prev ?? [])]);
      toast.success('Diagnóstico iniciado.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Algo deu errado. Tente novamente.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className='mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6'>
      <PageHeader
        title='Diagnóstico'
        description='Avalie as dimensões da sua vida e acompanhe a evolução ao longo do tempo.'
        actions={
          <Button onClick={start} disabled={creating || !user}>
            {creating ? 'Iniciando...' : 'Iniciar diagnóstico'}
          </Button>
        }
      />

      {!isLoading && !isLoggedIn ? (
        <Card>
          <CardContent className='flex flex-col items-start gap-4 py-6'>
            <p className='text-sm text-muted-foreground'>Entre para ver e iniciar os seus diagnósticos.</p>
            <Button asChild>
              <Link to='/login'>Entrar</Link>
            </Button>
          </CardContent>
        </Card>
      ) : error ? (
        <p className='text-sm text-destructive'>{error}</p>
      ) : items === null ? (
        <div className='space-y-3'>
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title='Nenhum diagnóstico ainda'
          description='Comece um diagnóstico para registrar a sua avaliação atual.'
          action={
            <Button onClick={start} disabled={creating || !user}>
              Iniciar diagnóstico
            </Button>
          }
        />
      ) : (
        <div className='space-y-3'>
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className='flex items-center justify-between gap-4 py-4'>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold'>Diagnóstico</p>
                  <p className='text-sm text-muted-foreground'>
                    {a.created_at ? formatDateTime(a.created_at) : ''}
                  </p>
                </div>
                <Badge variant={a.status === 'concluído' ? 'secondary' : 'outline'}>
                  {a.status ?? 'em andamento'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
