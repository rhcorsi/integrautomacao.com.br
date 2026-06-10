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
    xmlns: { dc: "http://purl.org/dc/elements/1.1/" },
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      categories: post.data.tags,
      // RSS 2.0 reserva <author> para e-mail; nome de autor vai em dc:creator.
      customData: `<dc:creator><![CDATA[${post.data.author}]]></dc:creator>`,
    })),
    customData: `<language>pt-BR</language>`,
  });
}
