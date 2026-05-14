<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html>
      <head>
        <title>Referto Ufficiale di Gara</title>
        <style>
          /* Stile burocratico e ufficiale tipo FIP */
          body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #000; margin: 20px; font-size: 14px; }
          .referto-container { background-color: #fff; border: 3px solid #000; padding: 30px; max-width: 900px; margin: auto; box-shadow: 0 0 15px rgba(0,0,0,0.2); }
          
          /* Intestazione */
          .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
          
          /* Dati Partita */
          .gara-info { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 20px; font-size: 16px; }
          .score-box { text-align: center; border: 2px solid #000; padding: 15px; margin-bottom: 30px; font-size: 22px; background-color: #f9f9f9; text-transform: uppercase; }
          
          /* Riquadri Squadre */
          .team-section { margin-bottom: 30px; border: 2px solid #000; }
          .team-header { background-color: #000; color: #fff; padding: 8px 10px; font-weight: bold; text-transform: uppercase; font-size: 16px; }
          
          /* Tabelle Giocatori */
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 6px 10px; text-align: left; }
          th { background-color: #e0e0e0; font-size: 12px; text-transform: uppercase; }
          .center { text-align: center; }
          .alert { color: red; font-weight: bold; font-size: 12px; }
          
          /* Spazio Firme */
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
          .sign-box { width: 30%; text-align: center; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .sign-line { border-bottom: 1px solid #000; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="referto-container">
          
          <div class="header">
            <h1>Referto Ufficiale di Gara - BasketTracker</h1>
          </div>

          <div class="gara-info">
            <div>GARA N. <xsl:value-of select="referto_partita/@id"/></div>
            <div>DATA: <xsl:value-of select="referto_partita/data"/></div>
          </div>

          <div class="score-box">
            <strong><xsl:value-of select="referto_partita/risultato/casa/@nome"/></strong> 
            &#160; <xsl:value-of select="referto_partita/risultato/casa"/> - 
            <xsl:value-of select="referto_partita/risultato/ospiti"/> &#160;
            <strong><xsl:value-of select="referto_partita/risultato/ospiti/@nome"/></strong>
          </div>

          <div class="team-section">
            <div class="team-header">SQUADRA A: <xsl:value-of select="referto_partita/risultato/casa/@nome"/></div>
            <table>
              <tr>
                <th width="10%" class="center">N. Maglia</th>
                <th width="50%">Tesserato</th>
                <th width="20%" class="center">Punti</th>
                <th width="20%" class="center">Falli</th>
              </tr>
              <xsl:for-each select="referto_partita/giocatori/giocatore[@squadra='Casa']">
                <xsl:sort select="@maglia" data-type="number" order="ascending"/>
                <tr>
                  <td class="center"><strong><xsl:value-of select="@maglia"/></strong></td>
                  <td><xsl:value-of select="nome"/></td>
                  <td class="center"><strong><xsl:value-of select="punti"/></strong></td>
                  <td class="center">
                    <xsl:value-of select="falli"/>
                    <xsl:if test="falli >= 5"> <span class="alert">(USCITO)</span></xsl:if>
                  </td>
                </tr>
              </xsl:for-each>
            </table>
          </div>

          <div class="team-section">
            <div class="team-header">SQUADRA B: <xsl:value-of select="referto_partita/risultato/ospiti/@nome"/></div>
            <table>
              <tr>
                <th width="10%" class="center">N. Maglia</th>
                <th width="50%">Tesserato</th>
                <th width="20%" class="center">Punti</th>
                <th width="20%" class="center">Falli</th>
              </tr>
              <xsl:for-each select="referto_partita/giocatori/giocatore[@squadra='Ospite']">
                <xsl:sort select="@maglia" data-type="number" order="ascending"/>
                <tr>
                  <td class="center"><strong><xsl:value-of select="@maglia"/></strong></td>
                  <td><xsl:value-of select="nome"/></td>
                  <td class="center"><strong><xsl:value-of select="punti"/></strong></td>
                  <td class="center">
                    <xsl:value-of select="falli"/>
                    <xsl:if test="falli >= 5"> <span class="alert">(USCITO)</span></xsl:if>
                  </td>
                </tr>
              </xsl:for-each>
            </table>
          </div>

          <div class="signatures">
            <div class="sign-box">
              Primo Arbitro
              <div class="sign-line"></div>
            </div>
            <div class="sign-box">
              Secondo Arbitro
              <div class="sign-line"></div>
            </div>
            <div class="sign-box">
              Ufficiale di Campo
              <div class="sign-line"></div>
            </div>
          </div>
          
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>