# Schwebender Gruppenchat

Im Gruppenchat schaltet „Chat auf allen Seiten“ die Chat-Blase ein. Sie beginnt rechts unten, öffnet und schließt per Klick und lässt sich mit Maus oder Touch ziehen. Per Tastatur verschieben Alt + Pfeiltasten die Blase. Escape klappt das geöffnete Panel ein. Schalter und Position werden im jeweiligen Browser pro Benutzer gespeichert.

Die Blase und die Chat-Seite verwenden denselben Chat. Beim Seitenwechsel bleiben Entwürfe, ausgewählte Anhänge und der geladene Verlauf erhalten. Gruppenwahl, Mitglieder, Dateivorschau, Download und Versand verwenden die bestehenden Berechtigungen und API-Endpunkte. Wenn das Panel auf der Chat-Seite geöffnet ist, zeigt die Seite einen kurzen Hinweis; beim Einklappen erscheint der Chat wieder auf der Seite.

Polling findet nur bei sichtbarem Chat und sichtbarem Browserdokument statt. Abmeldung entfernt Chat und Timer. Es gibt nur einen Chat-Controller, unabhängig von der Anzahl der Seitenwechsel. Nach einem vollständigen Neuladen bleiben Schalter und Position gespeichert, ungesendete Entwürfe werden nicht dauerhaft gespeichert.

Panel und Blase bleiben bei Fensteränderungen erreichbar. Das Panel richtet sich zur passenden Seite aus; reduzierte Bewegungen werden berücksichtigt. Die Blase ist für normale Benutzer und Lehrer mit Chatfreigabe verfügbar.

Prüfung: Browserprüfung von Einschalten, Öffnen/Schließen, Ziehen, Tastaturverschieben, Versand, Entwurf bei Seitenwechsel, Neuladen, Abschalten und mobiler Ansicht. `node tests/chat-bubble.mjs` prüft die Grenzen der Positionierung für drei Fenstergrößen.
