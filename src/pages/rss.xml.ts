import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { SITE } from "@/utils/site";
import { getPublishedPosts } from "@/utils/collections";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: `${SITE.name}, Blog técnico`,
    // Manter alinhada à description da página /blog/.
    description:
      "Artigos técnicos sobre PlantPAx, FactoryTalk, redes industriais, IEC 62443, migração de PLC e governança de engenharia industrial.",
    site: context.site!,
    stylesheet: "/rss.xsl",
    xmlns: { dc: "http://purl.org/dc/elements/1.1/" },
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
      // RSS 2.0 reserva <author> para e-mail; nome de autor vai em dc:creator.
      customData: `<dc:creator><![CDATA[${post.data.author}]]></dc:creator>`,
    })),
    customData: `<language>pt-BR</language>`,
  });
}
