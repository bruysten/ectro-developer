# SEO & GEO Lab

Das projektgebundene `#geo-lab` begleitet den Unterricht mit einem bearbeitbaren Experiment. Es veröffentlicht keine Inhalte und verspricht keine Aufnahme in KI-Suchantworten. Quellcode und Verarbeitung bleiben in der Anwendung; keine externen UI-Bibliotheken, Crawler-Dienste oder Analyse-Skripte werden nachgeladen. Nur der ausdrücklich ausgelöste HTTPS-Import und optionale Modellaufrufe verlassen den Server.

## Lernweg

1. **Frage klären:** Zielgruppe, eindeutiger Gegenstand, Hauptfrage, bis zu vier Teilfragen, Seitenziel und prüfbare Verbesserungshypothese.
2. **Seite prüfen:** HTML, Markdown oder Text einfügen, lokal hochladen, aus dem berechtigten Projekt übernehmen oder eine öffentliche HTTPS-Seite abrufen. Fundstellen zeigen Wortüberschneidungen mit der Frage. Diese sind keine semantische Bewertung. Titel, Beschreibung, Gliederung, Entitätsbenennung, starke Behauptungen und JSON-LD werden untersucht. Metadaten und robots.txt stehen im technischen Prüfbereich; Indexierung und tatsächliches Crawling bleiben unbekannt.
3. **Belege sichern:** Aussage, Quellenadresse, Originalauszug und genaue Belegstelle zusammen dokumentieren. Eine fachliche Bestätigung setzt eine wörtlich enthaltene Stelle voraus. Änderungen an einem Beleg heben dessen Bestätigung auf. Zeichenfolgenprüfung ist keine Wahrheitsprüfung. Das mitgelieferte Beispiel ist synthetisch und wird auch beim Export entsprechend bezeichnet.
4. **Überarbeiten:** Einen Markdown-Entwurf selbst schreiben, den Ausgangstext übernehmen oder ein neutrales Antwortgerüst mit sichtbaren Platzhaltern nutzen. Metadaten, Verantwortlichkeit und Prüfdatum ergänzen; vier fachliche Kriterien selbst bestätigen. Lesefassung und eigenständiger HTML-Export führen fremdes HTML nicht aus.
5. **Fassungen testen:** Inhaltsmerkmale nebeneinander vergleichen. Optional ein Modell mit derselben Frage und jeweils einer bereitgestellten Fassung als S1 testen. S2 bleibt als optionale Vergleichsquelle unverändert. Zwei getrennte Aufrufe mit demselben freigegebenen Modell; keine Websuche und kein Vergleich realer Suchrankings. Bis zu sechs Paare mit exakten Eingaben, Antworten, Modell und Zeitpunkt speichern und menschlich beurteilen. Mehrere Durchläufe und Fragevarianten sind sinnvoll; die kleinen manuellen Fallzahlen sind keine statistische Wirkungsstudie.
6. **Wirkung beobachten:** Bis zu 30 tatsächliche Suchbeobachtungen mit Dienst, Frage, Datum, Kontext, Erwähnung, verlinkter Quelle und Notiz erfassen. Unbekannte Angaben bleiben außerhalb des Zitierungsnenners. Erwähnung, Zitierung und Websitebesuch sind unterschiedliche Ergebnisse. Ein Lernprotokoll exportiert die gespeicherten Stände.

**Freigaben:** `geo_lab` benötigt `files`, aber weder Coding Lab noch einen KI-Zugang. Admins können es wie die anderen Labs pro Gruppe ein- und ausschalten. Projektkatalog, aktive Gruppen, eigene bzw. Gruppenprojekte und serverseitige Berechtigungen gelten auf allen neuen Endpunkten. Optionale KI-Vergleiche benötigen zusätzlich `ai` und eine eigene oder freigegebene Chat-Verbindung. Bestehende Gruppen-/Projektbudgets und Tokenreservierungen gelten weiter.

**Speicherung:** Mehrere Arbeiten je Projekt mit dem vorhandenen Versions- und Konfliktmodell. Frühere Testeingaben werden nicht nachträglich aus dem aktuellen Entwurf rekonstruiert. Gleichzeitige Änderungen werden abgewiesen, nicht überschrieben. Ein wiederholter abgeschlossener Vergleich kostet keine weiteren Aufrufe. Nach einem Teilfehler werden fertige Teilantworten wiederverwendet; ein ausdrücklich erneut gestarteter fehlgeschlagener Teil kann erneut Kosten verursachen. Änderungen an Frage, Fassungen, Vergleichsquelle oder Verbindung erzeugen andere Aufrufkennungen.

## Recherche und Entscheidungen

Recherche am **9. November 2026**, aus Primärquellen. Betreiberhinweise beschreiben deren Produkte, keine universell bewiesene Optimierungsformel. Experimentelle Forschung und Preprints werden entsprechend eingeordnet.

| Quelle | Aussage und Konsequenz im Lab |
| --- | --- |
| [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) | SEO-Grundlagen bleiben relevant. Google fordert weder spezielle AI-Dateien noch ein spezielles GEO-Schema. Indexierung und Snippet-Eignung sind Voraussetzungen, keine Aufnahmegarantie. Deshalb konkrete technische Hinweise statt erfundenem GEO-Score. |
| [Microsoft: Optimizing content for inclusion in AI search answers](https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers) | Eindeutige, gut strukturierte Inhalte und belastbare Belege unterstützen verständliche Antworten. Daraus entstehen die redaktionellen Arbeitsschritte, keine versprochene Sichtbarkeitssteigerung. |
| [Bing: AI Performance in Webmaster Tools](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/) | Zitierungszahlen, zitierte Seiten und Grounding Queries sind Beobachtungsdaten. Sie sind keine Rankings, Autoritätswerte oder garantierten Platzierungen. Deshalb ein getrenntes Beobachtungsprotokoll. |
| [OpenAI: Overview of OpenAI crawlers](https://developers.openai.com/api/docs/bots) | OAI-SearchBot für Suche und GPTBot für Modelltraining getrennt behandeln. Nutzerinitiierte Abrufe sind ein anderer Mechanismus. Ein Training-Opt-out ist kein pauschaler Suchausschluss. |
| [Perplexity: Crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) | PerplexityBot dient Suchergebnissen; nutzerinitiierte Abrufe unterscheiden sich davon. Keine Gleichsetzung von Crawlerfreigabe und tatsächlicher Zitierung. |
| [Google: robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) | Regeln nach Agent und URL-Pfad auswerten; spezifischere Regeln, Allow bei gleicher Pfadlänge, Wildcards und Endanker beachten. Auswertung des aufgezeichneten Stands, kein vollständiger Crawler- oder Indexierungstest. |
| [Google: Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) | Strukturierte Daten müssen zum sichtbaren Inhalt passen. Erkanntes JSON-LD ist weder vollständige Schema- noch Faktenvalidierung. Deshalb bewusst keine automatische „GEO-Schema“-Erzeugung. |
| [Aggarwal et al.: GEO: Generative Engine Optimization](https://arxiv.org/abs/2311.09735) | Originalarbeit mit kontrollierten Experimenten und domänenabhängigen Ergebnissen. Deren berichtete Effekte sind keine allgemeine Traffic- oder Rankinggarantie. Der Unterrichtstest trennt bereitgestellte Quellen von Web-Auffindbarkeit. |
| [Forschungsüberblick, Preprint Juli 2026](https://arxiv.org/abs/2607.14035) | Generative Suche ist eine mehrstufige und variable Verarbeitung. Wiederholungen, unterschiedliche Fragen, Retrieval-Kontext und menschliche Qualitätsprüfung bleiben relevant. Der Modelltest behauptet daher keine belastbare reale Sichtbarkeit. |

Die Bedienoberfläche enthält diese Quellen und die Grenzen der Methode unter „Was dieses Lab prüft“. Die Umsetzung kopiert keine fremden Oberflächen oder Optimierungsalgorithmen.

## Sicherheits- und Verarbeitungsgrenzen

- Öffentlicher HTTPS-Import auf Port 443, ohne Zugangsdaten, Cookies, Proxy oder JavaScript. Hostnamen statt IP-Literalen. Alle aufgelösten A-/AAAA-Adressen müssen öffentlich sein. IPv4-Sondernetze, IPv6-Sonder-/Dokumentations-/Tunnel-/lokale Netze werden abgewiesen. DNS-Pinning pro Anfrage; keine automatische Redirect-Verfolgung. Jede Weiterleitung wird erneut aufgelöst und geprüft, maximal drei. TLS-Prüfung bleibt aktiv.
- 512 KB nach Dekompression, 32 KB Header, HTTP-Deadline von 18 Sekunden für die Seite plus sechs Sekunden für robots.txt; die systemseitige DNS-Auflösung kann zusätzlich Zeit benötigen. Nur HTML/XHTML/Text mit lesbarer Kodierung; keine Teilantworten. Seitentext maximal 60.000 Zeichen / 160 Blöcke. Gekürzte Auszüge werden kenntlich gemacht. Die technische Auswertung betrifft den erfassten Stand; Imports können Abrufangaben mitbringen und sind keine unabhängig beglaubigten Messungen.
- DOM-Auswertung ohne externe Entitätsauflösung oder Netzladefunktion; Scripts, Einbettungen, Navigation und explizit verborgene Elemente werden nicht als Textquelle genutzt. CSS und JavaScript werden nicht gerendert. Über CSS verborgener oder erst dynamisch geladener Inhalt kann deshalb vom echten Browserbild abweichen; das ist eine HTML-/Textanalyse, kein Browser-Crawl.
- Eingefügtes HTML, Antworten und URLs bleiben Daten. Vorschau und Exporte maskieren Inhalte; der HTML-Export setzt eine restriktive CSP. Keine Ausführung von Quellenanweisungen. Links sind nur HTTP(S) ohne eingebettete Zugangsdaten.
- Modelltests: höchstens 12.000 extrahierte Zeichen je S1-Fassung, 4.000 Zeichen S2 und 12.000 Zeichen je Antwort. Bestehende 1-MB-Grenze für gespeicherte Laborobjekte gilt zusätzlich. Keine echten Provideraufrufe in automatisierten Tests.

## Prüfung

- `node tests/geo.mjs`: 81 PHP-Prüfungen plus JS-Prüfungen für Migration mit Readiness-Historie/Statistikdaten, Zugriffsrechte, inerte Extraktion, Grenzen, SSRF und Redirects, Robots-Regeln, kontrollierte Modellpaare, Replay, explizite Wiederholung nach Teilfehler, Versionskonflikte und sichere Exporte.
- `node tests/lab-models.mjs`: gesamte Modell-/Laborregression einschließlich GEO.
- `python3 tests/labs-integration.py`: 370 HTTP-/Lab-/Sicherheitsprüfungen einschließlich neuer Endpunkte, CSRF und laufender Gruppenfreigaben; zusätzlich 25 parallele Sitzungen.
- `python3 tests/integration.py`: 627 bestehende API-/Sicherheitsprüfungen.
- Browserprüfung mit synthetischen Lernkonten: Quellenarbeit, Gerüst, Entwurf/Lesefassung, Speichern, Vergleich ohne KI-Freigabe, Beobachtungsformular sowie 320/768 Pixel ohne horizontalen Seitenüberlauf. Echter HTTPS-Import separat mit öffentlicher Beispielseite überprüft; dabei PHP-8.5-Kompatibilität von cURL korrigiert. Kein echter KI-Aufruf.
