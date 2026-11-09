# Automatische Sichtbarkeit freigegebener Labore

Änderungen an wirksamen Gruppen-, Konto- und Systemeinstellungen werden in bereits geöffneten Frontend-Sitzungen übernommen. Navigation und **Alle Labs** erhalten neu freigegebene Labore; entzogene Rechte werden wieder ausgeblendet. Ein erneutes Anmelden oder manuelles Neuladen ist für diese Einstellungsänderungen nicht erforderlich.

## Abgleich

- Sichtbare Frontend-Sitzungen lesen ihre eigenen Berechtigungen alle zehn Sekunden erneut vom Server. Im Hintergrund gilt ein längeres Intervall von 60 Sekunden. Serverseitige Zugriffs-/Kurszeitgrenzen können einen früheren Abgleich auslösen.
- Beim Zurückkehren zum Tab, beim Fensterfokus und nach Wiederherstellung der Verbindung erfolgt ein unmittelbarer Abgleich.
- Erfolgreiche administrative Änderungen an Benutzern, Gruppen und Systemeinstellungen senden an andere Tabs desselben Ursprungs zusätzlich einen Hinweis über `BroadcastChannel`. Wenn diese API nicht verfügbar ist, dient ein Storage-Ereignis als Alternative. Andere Browser und Geräte verwenden den regelmäßigen Abgleich.
- Der Hinweis enthält keine Rechte, Konto-IDs oder Schlüssel. Jeder Empfänger fragt seine eigenen wirksamen Rechte serverseitig ab. Die vorhandene Verknüpfung von System-, Gruppen-, Konto- und Projektgrenzen wird nicht verändert. Eine Freigabe hebt andere weiterhin geltende Sperren nicht auf.
- Während einer laufenden Abfrage eingehende Hinweise werden zusammengefasst und anschließend erneut geprüft. Veraltete Antworten einer vorherigen Anmeldung werden nicht auf ein neues Konto angewendet. Der Abgleich besitzt nur einen Wiederholungstimer.

## Offene Arbeit erhalten

Reine Freigabeänderungen erzeugen keinen kompletten Neuaufbau der Anwendung. Die Navigation wird gezielt aktualisiert; Öffnungszustand des Laborbereichs, Scrollposition und möglicher Tastaturfokus werden erhalten. Unter **Alle Labs** wird nur die schreibgeschützte Übersicht aktualisiert; alle Kacheln werden anschließend wieder gleich hoch ausgerichtet.

Geöffnete Editoren, ungespeicherte Eingaben und Profilformulare bleiben bestehen. Die von laufenden Laboren gehaltene Referenz auf die Rechte wird aktualisiert. Bei einer einzelnen Labor- oder Projektsperre bleibt der Entwurf des betroffenen Bereichs erhalten, während die Arbeitsfläche ausgeblendet und gesperrt wird. Eine vollständige Sperre des Lernzugangs verwendet weiterhin die vorhandene Zugriffssperrseite. API-Berechtigungen gelten unmittelbar serverseitig. Änderungen an der Ansprache werden wie bisher erst bei einem sicheren Zustand vollständig dargestellt. Der schwebende Gruppenchat wird nur bei einer tatsächlichen Chat-Sperre oder einem verlorenen Gruppenkontext zurückgesetzt; eine neue Chat-Freigabe blendet ihn gezielt ein.

Diese Funktion aktualisiert Berechtigungen innerhalb der geladenen App-Version. Eine bereits mit älterem Anwendungscode geöffnete Seite muss das Update einmal laden. Danach benötigen weitere Freigabeänderungen kein manuelles Neuladen.

## Validierung

`tests/workspace-access-sync.mjs` prüft die echten Signal- und Abgleichfunktionen: Kanal/Storage-Alternative, Fokus/Sichtbarkeit/Online-Ereignisse, Zehn-Sekunden-Intervall und frühere Zeitgrenzen, Hinweise während laufender Anfragen, stabile Rechte-Referenzen, Kontowechsel und Erhalt eines bearbeiteten Editors. Die Navigationsprüfung deckt Öffnungszustand, Scrollposition und Fokus ab. Der Test läuft mit den vorhandenen Gruppenzeitraum- und Ansprachetests. Die Produktions-API-Helfer werden außerdem darauf geprüft, dass administrative Änderungen Hinweise auslösen und gewöhnliche Projektoperationen dies nicht tun.

Im Browser wurde eine eigene Testgruppe mit einer unabhängigen Lernersitzung verwendet. Readiness war zunächst nicht sichtbar, erschien nach serverseitiger Freigabe ohne Neuladen sowohl in Navigation als auch Übersicht und verschwand nach Entzug wieder automatisch. Ein zusätzliches Labor erschien während eines ungespeicherten Prompt-Entwurfs; Text, Fokus und Route blieben erhalten. Bei einem geöffneten Profilformular blieben Dialog und Formulareingabe erhalten, während die neue Kachel darunter erschien. Bei 320, 768 und 1440 Pixeln blieben alle 13 sichtbaren Lab-Kacheln gleich hoch, ohne Seitenüberlauf. Es wurden keine KI-Anfragen ausgeführt.
