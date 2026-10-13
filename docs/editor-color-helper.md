# Farben im Editor

Bei HTML-, CSS- und weiteren Web-Dateien sowie erkannten HTML-/CSS-Inhalten in Scripts, Strings und Vorlagen öffnet das Paletten-Symbol neben dem Dateinamen den Farbhelfer. Eine markierte Farbe oder ein HEX-, RGB- oder Lab-Wert unter dem Cursor wird übernommen. Ohne vorhandenen Farbwert wird die neue Farbe an der Cursorposition eingefügt; eine andere markierte Auswahl wird ersetzt.

Das Farbfeld, der Farbton und die Deckkraft aktualisieren HEX, RGB und CIELAB gemeinsam. „Im Code verwenden“ bestimmt die Schreibweise. Erst „Farbe einsetzen“ verändert den Code. Die Änderung kann rückgängig gemacht und wie gewohnt gespeichert werden.

Lab verwendet den D50-Weißpunkt gemäß [CSS Color 4](https://www.w3.org/TR/css-color-4/#color-conversion-code). Lab-Farben außerhalb von sRGB bleiben bei Lab-Ausgabe erhalten; die Vorschau sowie RGB/HEX zeigen eine begrenzte Annäherung. Der Hinweis im Dialog macht dies sichtbar.

In Gruppenprojekten werden Änderungen vor der Zielstelle berücksichtigt. Ändert jemand die betreffende Stelle, verhindert der Dialog das Ersetzen und bittet um erneutes Öffnen. Das normale Speichern und die bestehende Gruppensynchronisation bleiben aktiv.

Prüfung: `node tests/color.mjs` prüft Referenzwerte, Umrechnungen, Transparenz, Eingabevalidierung, Farberkennung und die Zuordnung der Zielstelle bei gleichzeitigen Änderungen. Browserprüfung umfasst Ersetzen, Rückgängig, Abbrechen, visuelle Auswahl, Tastaturbedienung, ungültige Werte und eine Ansicht mit 390 Pixeln Breite.

Die Anzeige aktualisiert sich beim Laden, beim Bearbeiten und bei synchronisierten Änderungen aus Gruppenprojekten. Reiner PHP-/JavaScript-/Python-Code ohne HTML/CSS aktiviert den Helfer nicht. Die Inhaltserkennung ist eine begrenzte Heuristik anhand von Markup und CSS-Deklarationen; sie führt keinen Code aus. `node tests/color-context.mjs` prüft positive Fälle und typische Nicht-Web-Inhalte.
