import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE } from "@/utils/site";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  return rss({
    title: `${SITE.name}, Blog técnico`,
    description:
      "Artigos técnicos sobre PlantPAx, FactoryTalk, redes industriais, IEC 62443 e governança de engenharia industrial.",
    site: context.site!,
    stylesheet: "/rss.xsl",
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      author: `${SITE.name}`,
      link: `/blog/${post.slug}/`,
      categories: post.data.tags,
    })),
    customData: `<language>pt-BR</language>`,
  });
}
