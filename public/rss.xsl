<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title><xsl:value-of select="/rss/channel/title" /></title>
        <style>
          :root {
            color-scheme: light;
            --red: #e30613;
            --red-dark: #b40510;
            --ink: #1a1a1a;
            --muted: #5f646d;
            --line: #d9dde3;
            --soft: #f5f5f5;
            --white: #fff;
          }

          * { box-sizing: border-box; }

          body {
            margin: 0;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: var(--white);
            color: var(--ink);
            line-height: 1.6;
          }

          a { color: inherit; }

          .topbar {
            border-bottom: 1px solid var(--line);
            background: var(--soft);
          }

          .wrap {
            width: min(1120px, calc(100% - 32px));
            margin: 0 auto;
          }

          .topbar .wrap {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 10px 0;
            color: var(--muted);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: .12em;
          }

          header {
            border-bottom: 1px solid var(--line);
          }

          header .wrap {
            display: grid;
            gap: 24px;
            padding: 56px 0 48px;
          }

          .eyebrow {
            margin: 0;
            color: var(--red);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: .22em;
            text-transform: uppercase;
          }

          h1 {
            max-width: 860px;
            margin: 0;
            font-size: clamp(36px, 6vw, 68px);
            line-height: .98;
            letter-spacing: 0;
          }

          .lead {
            max-width: 760px;
            margin: 0;
            color: var(--muted);
            font-size: 18px;
          }

          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 6px;
          }

          .button {
            display: inline-flex;
            align-items: center;
            min-height: 44px;
            padding: 10px 16px;
            border-radius: 6px;
            border: 1px solid var(--line);
            font-weight: 700;
            text-decoration: none;
          }

          .button.primary {
            border-color: var(--red);
            background: var(--red);
            color: var(--white);
          }

          .button.primary:hover { background: var(--red-dark); }

          main {
            padding: 40px 0 72px;
          }

          .feed-list {
            display: grid;
            gap: 16px;
          }

          article {
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 24px;
            background: var(--white);
          }

          article h2 {
            margin: 0 0 8px;
            font-size: clamp(22px, 3vw, 32px);
            line-height: 1.15;
          }

          article h2 a {
            text-decoration: none;
          }

          article h2 a:hover {
            color: var(--red);
          }

          .meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 14px;
            margin: 0 0 14px;
            color: var(--muted);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: .12em;
          }

          .summary {
            max-width: 820px;
            margin: 0 0 18px;
            color: #2c2c2c;
          }

          .read {
            color: var(--red);
            font-weight: 700;
            text-decoration: none;
          }

          .read:hover {
            color: var(--red-dark);
          }

          footer {
            border-top: 1px solid var(--line);
            padding: 28px 0;
            color: var(--muted);
            font-size: 14px;
          }

          code {
            padding: 2px 5px;
            border-radius: 4px;
            background: var(--soft);
            color: var(--ink);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: .92em;
          }
        </style>
      </head>
      <body>
        <div class="topbar">
          <div class="wrap">
            <span>Integra Automação Industrial</span>
            <span>Feed RSS</span>
          </div>
        </div>

        <header>
          <div class="wrap">
            <p class="eyebrow">Blog técnico</p>
            <h1><xsl:value-of select="/rss/channel/title" /></h1>
            <p class="lead"><xsl:value-of select="/rss/channel/description" /></p>
            <div class="actions">
              <a class="button primary" href="/">Voltar ao site</a>
              <a class="button" href="/blog/">Ver blog</a>
              <a class="button" href="/rss.xml">URL do feed</a>
            </div>
          </div>
        </header>

        <main>
          <div class="wrap feed-list">
            <xsl:for-each select="/rss/channel/item">
              <article>
                <p class="meta">
                  <span><xsl:value-of select="pubDate" /></span>
                  <xsl:for-each select="category">
                    <span><xsl:value-of select="." /></span>
                  </xsl:for-each>
                </p>
                <h2>
                  <a>
                    <xsl:attribute name="href"><xsl:value-of select="link" /></xsl:attribute>
                    <xsl:value-of select="title" />
                  </a>
                </h2>
                <p class="summary"><xsl:value-of select="description" /></p>
                <a class="read">
                  <xsl:attribute name="href"><xsl:value-of select="link" /></xsl:attribute>
                  Ler artigo →
                </a>
              </article>
            </xsl:for-each>
          </div>
        </main>

        <footer>
          <div class="wrap">
            Este endereço continua sendo um feed RSS válido. Use <code>/rss.xml</code> em leitores como Feedly,
            Inoreader, NetNewsWire ou outros agregadores.
          </div>
        </footer>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
