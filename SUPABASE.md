# Ligar a sincronização em nuvem

O Adega reaproveita o **mesmo projeto Supabase do PepTrack**
(`infgemqgrcbwzqtatrpk`), então o login com Google já está configurado. Falta
criar as tabelas do Adega e liberar a URL de retorno.

São três passos, todos no painel do Supabase. **Faça num computador** — o
editor de SQL é sofrível no celular.

---

## 1. Liberar a URL do app no login

**Authentication → URL Configuration → Redirect URLs → Add URL:**

```
https://epentgna.github.io/adega/**
```

Se for rodar local também, adicione `http://localhost:5173/**`.

Não mexa no **Site URL** — ele continua apontando para o PepTrack.

---

## 2. Criar a tabela de estado

**SQL Editor → New query**, cole tudo e rode:

```sql
-- Estado da adega: uma linha por usuário, sem as fotos.
create table if not exists public.adega_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.adega_state enable row level security;

-- Cada um só enxerga e escreve a própria linha.
drop policy if exists "adega_state_select" on public.adega_state;
create policy "adega_state_select" on public.adega_state
  for select using (auth.uid() = user_id);

drop policy if exists "adega_state_insert" on public.adega_state;
create policy "adega_state_insert" on public.adega_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "adega_state_update" on public.adega_state;
create policy "adega_state_update" on public.adega_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "adega_state_delete" on public.adega_state;
create policy "adega_state_delete" on public.adega_state
  for delete using (auth.uid() = user_id);

-- Avisa os outros aparelhos quando a linha muda.
do $$
begin
  alter publication supabase_realtime add table public.adega_state;
exception
  when duplicate_object then null;
end $$;
```

---

## 3. Criar o bucket das fotos

Na mesma janela do SQL Editor:

```sql
-- Bucket privado das fotos de rótulo.
insert into storage.buckets (id, name, public)
values ('adega-fotos', 'adega-fotos', false)
on conflict (id) do nothing;

-- O primeiro nível do caminho é o id do usuário: user-id/foto.webp
drop policy if exists "adega_fotos_select" on storage.objects;
create policy "adega_fotos_select" on storage.objects
  for select using (
    bucket_id = 'adega-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "adega_fotos_insert" on storage.objects;
create policy "adega_fotos_insert" on storage.objects
  for insert with check (
    bucket_id = 'adega-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "adega_fotos_update" on storage.objects;
create policy "adega_fotos_update" on storage.objects
  for update using (
    bucket_id = 'adega-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "adega_fotos_delete" on storage.objects;
create policy "adega_fotos_delete" on storage.objects
  for delete using (
    bucket_id = 'adega-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## Testar

1. Abra o app, vá em **Gestão → Configurações → Conta e sincronização**
2. **Entrar com Google**
3. O status deve virar **Tudo sincronizado**
4. Abra o app em outro aparelho, entre com a mesma conta: o catálogo aparece,
   e as fotos descem conforme você navega

Se der erro de permissão, quase sempre é o passo 1 (URL de retorno) ou uma
política que não rodou.

---

## Como funciona

- **Ficha dos vinhos** (adegas, consumo, ajustes) vive numa linha `jsonb`.
  300 rótulos dão ~500 KB — o plano grátis tem 500 MB de banco.
- **Fotos** vão para o Storage, uma por arquivo, em `user-id/id-carimbo.webp`.
  300 garrafas com 2 fotos ≈ 70 MB, contra 1 GB do plano grátis.
- **Envio** é agrupado: 2 s depois da última edição, sai um estado só.
- **Recebimento**: o realtime avisa que a linha mudou e o app busca a versão
  nova (o estado inteiro é grande demais para viajar dentro do aviso). Também
  há uma conferida sempre que o app volta ao primeiro plano.
- **Fotos descem sob demanda**, quando aparecem na tela — entrar num aparelho
  novo não baixa 70 MB de uma vez. Em Configurações há um botão para baixar
  todas de propósito (antes de uma viagem sem internet, por exemplo).
- **Conflito**: se este aparelho tem catálogo e a nuvem também, o app **para** e
  pergunta qual dos dois continua, em vez de escolher sozinho. Fora esse caso,
  vence o estado mais recente.

### Limite conhecido

Não há mesclagem por vinho: o estado é gravado inteiro. Editar o **mesmo**
catálogo em dois aparelhos ao mesmo tempo, offline, faz a última gravação
vencer. Para uso de uma pessoa é o esperado; se um dia virar coisa de duas
pessoas ao mesmo tempo, o certo é migrar para tabelas por vinho.

### O que nunca sai do aparelho

A **chave da API da Anthropic**. Ela não vai para a nuvem nem para o backup em
arquivo — se entrar num aparelho novo, precisa colar a chave de novo lá.
