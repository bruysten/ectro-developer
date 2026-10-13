# Team und freiwillige Profilfreigabe

`/#team` zeigt ausschließlich aktive, aktuell zugehörige Gruppenmitglieder mit ausdrücklicher Freigabe. Die Freigabe steht standardmäßig aus; private Profile können unabhängig davon bearbeitet werden. Mitglieder können andere freigegebene Profile auch ohne eigene Freigabe ansehen. Unter `/admin/#features` lässt sich Team global steuern; Gruppen- und Benutzerfreigaben greifen ebenfalls.

Die Einwilligung benennt Verantwortlichen, Zweck, Profilfelder und Empfänger einschließlich Lehrkräften. Widerruf erfolgt durch Abwählen im eigenen Profil. Die private Speicherung des Profils und die für den Betrieb notwendigen Kontodaten werden dadurch nicht gelöscht. Freigaben gelten auch für neu zugewiesene Lerngruppen; darauf weist der Dialog ausdrücklich hin.

Das Backend prüft Gruppenmitgliedschaft, aktive Konten, Funktionsfreigabe und Einwilligung bei jeder Abfrage und jedem geteilten Profilbild. Kein Login-E-Mail, Passwort oder Konto-Freigaben werden ausgegeben. Antworten werden nicht gecacht. Die Ansicht aktualisiert sich alle 15 Sekunden sowie bei Rückkehr zum Fenster; bekannte URLs sind serverseitig unmittelbar nach Widerruf gesperrt. Bereits gelesene oder gespeicherte Informationen lassen sich nicht zurückrufen.

Eine separate SQLite-Tabelle entsteht automatisch beim Update. Die Einwilligung wird mit Wortlaut, Version und Zeitpunkt gespeichert; Erteilung und Widerruf werden protokolliert. Alte Profil-Clients ändern die Einwilligung bei ausgelassenem Feld nicht. Änderungen an Profil und Freigabe sind atomar und gegen veraltete Speicherversionen geschützt. Bei einer späteren Änderung der Einwilligungsversion bleiben frühere Freigaben gesperrt, bis erneut zugestimmt wird.

## Information durch den Betreiber

Der Checkboxtext ersetzt keine vollständige Datenschutzerklärung. Der Betreiber muss vor der Erhebung insbesondere Kontakt des Verantwortlichen, Rechtsgrundlagen der privaten Profil- und Kontospeicherung, Aufbewahrungsfristen (auch für Einwilligungsnachweise), Dienstleister, Betroffenenrechte und Beschwerdemöglichkeit angeben. Diese Angaben sind nicht vollständig im Projekt hinterlegt und müssen passend zum tatsächlichen Betrieb bereitgestellt werden. Keine rechtliche Vollständigkeitsgarantie.

Grundlage: DSGVO Art. 7 (freiwillige, nachweisbare, widerrufliche Einwilligung) und Art. 13 (Information bei Erhebung): [offizieller Verordnungstext](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679); [BfDI: Datenschutz-Grundverordnung und Bundesdatenschutzgesetz](https://www.bfdi.bund.de/SharedDocs/Downloads/DE/Broschueren/INFO1.pdf?__blob=publicationFile&v=23).
