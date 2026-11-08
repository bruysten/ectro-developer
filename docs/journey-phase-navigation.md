# Journey-Phasen navigieren

Die Journey bleibt eine horizontale Arbeitsfläche. Oberhalb der Karten stehen eine direkte Auswahl aller Phasen, die Position „Phase X von Y“ und zwei Schaltflächen für die vorherige/nächste Phase. Diese Navigation scrollt nicht mit den Karten aus dem sichtbaren Bereich. Ein Phasenwechsel verschiebt die Seite nicht zum darunterliegenden Editor.

Die Kartenbreite richtet sich nach der tatsächlich verfügbaren Fläche, einschließlich Seitenleiste und Panel-Abständen. Es passen ganze Karten in die Leiste; auf schmalen Displays wird eine Karte vollständig angezeigt. Die Leiste bleibt nativ per Trackpad, Scrollbar oder Wischgeste bedienbar. Die aktive Karte wird bei Auswahl, Umordnung und Größenänderungen horizontal ins Sichtfeld gebracht. Das Bearbeiten von Feldern setzt die Scrollposition nicht zurück. Die Stimmungskurve zeigt auch auf schmalen Displays sämtliche Phasen ohne eigene horizontale Scrollfläche. Ihre Beschriftung reduziert sich passend zur Breite; die aktive Phase erhält zusätzlich einen Ring.

Die aktive Karte ist per Tab erreichbar. Pfeil links/rechts wechselt die Phase; Pos1/Ende springt an den Anfang bzw. das Ende. Der Fokus bleibt auf der aktiven Karte. Die Auswahl und Pfeile bleiben bei null/einer Phase konsistent, die letzte/erste Richtung ist deaktiviert. Bei 20 Phasen sind Hinzufügen und Duplizieren deaktiviert. Reduzierte Bewegung wird berücksichtigt; Beobachter und Ereignisbehandlung werden beim Verlassen der Journey entfernt.

## Prüfung

- `node tests/journey-navigation.mjs`: 20 Phasen, passende Spalten, direkte Auswahl, Vor/Zurück, Tastatur, stabile Bearbeitung, Größenänderung, Umordnen, Entfernen, leere/einzelne Phase, sichere Beschriftungen, reduzierte Bewegung und Aufräumen.
- Der Test ist in `tests/lab-models.mjs` eingebunden.
- Lokale Browserprüfung mit einer separaten Journey mit 20 Phasen, langen Namen und unterschiedlichen Stimmungen bei 320, 375, 600, 768, 1024, 1440 und 1920 Pixeln: kein horizontaler Seitenüberlauf, aktive Karte vollständig sichtbar. Zusätzliche Interaktionsprüfung für Auswahl, Tastatur, Bearbeitung, Umordnung, Löschen, Duplizieren und Speichern.

Die bisherigen Speicherformate, Zugriffsregeln und Gruppenfreigaben bleiben bestehen. Der Service-Blueprint nutzt weiterhin dieselben Journey-Phasen; seine Übersicht besitzt eine eigene horizontale Arbeitsfläche und die alternative Einzelphasenansicht.
