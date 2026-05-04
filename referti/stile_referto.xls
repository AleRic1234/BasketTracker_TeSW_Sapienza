<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .testata { border: 2px solid #000; padding: 10px; margin-bottom: 20px; text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #999; padding: 8px; text-align: left; }
          th { background-color: #eee; }
          .punteggio { font-size: 24px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="testata">
          <h1>Referto Ufficiale BasketTracker</h1>
          <p>Data Partita: <xsl:value-of select="referto_partita/data"/></p>
          <div class="punteggio">
            <xsl:value-of select="referto_partita/risultato/casa/@nome"/> 
            [<xsl:value-of select="referto_partita/risultato/casa"/>] - 
            [<xsl:value-of select="referto_partita/risultato/ospiti"/>] 
            <xsl:value-of select="referto_partita/risultato/ospiti/@nome"/>
          </div>
        </div>

        <h2>Tabellino Giocatori</h2>
        <table>
          <tr>
            <th>Maglia</th>
            <th>Nome</th>
            <th>Punti</th>
            <th>Falli</th>
          </tr>
          <xsl:for-each select="referto_partita/giocatori/giocatore">
            <xsl:sort select="punti" data-type="number" order="descending"/>
            <tr>
              <td><xsl:value-of select="@maglia"/></td>
              <td><xsl:value-of select="nome"/></td>
              <td><xsl:value-of select="punti"/></td>
              <td><xsl:value-of select="falli"/></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
