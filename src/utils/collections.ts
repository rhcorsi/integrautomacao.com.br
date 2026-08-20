/**
 * Acessos centralizados às content collections: filtro de draft + ordenação
 * por data num único lugar. Antes, o padrão
 * `(await getCollection("blog", ({data}) => !data.draft)).sort(...)` estava
 * duplicado em 6+ arquivos — mudar a regra (ex.: esconder posts futuros)
 * exigiria editar todos.
 */
import { getCollection, type CollectionEntry } from "astro:content";

/** Posts publicados, mais recentes primeiro. */
export async function getPublishedPosts(): Promise<CollectionEntry<"blog">[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

/** Cases publicados, mais recentes primeiro. */
export async function getPublishedCases(): Promise<CollectionEntry<"cases">[]> {
  const cases = await getCollection("cases", ({ data }) => !data.draft);
  return cases.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

/** Eventos publicados, mais recentes primeiro. */
export async function getPublishedEventos(): Promise<
  CollectionEntry<"eventos">[]
> {
  const eventos = await getCollection("eventos", ({ data }) => !data.draft);
  return eventos.sort(
    (a, b) => b.data.startDate.getTime() - a.data.startDate.getTime(),
  );
}
