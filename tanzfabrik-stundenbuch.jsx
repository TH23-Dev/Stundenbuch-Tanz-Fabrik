import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";

/* ------------------------------------------------------------------
   Stundenbuch – Tanz-Fabrik · Prototyp v2
   Stammdaten aus Kursplan (Stand 04.06.) + Ansätze aus Juni-Abrechnung.
   Lektionen werden aus den Kursen abgeleitet -> Änderungen an Kursen
   wirken sofort, ohne dass Lektionen neu erzeugt werden müssen.
------------------------------------------------------------------ */

const C = { ink:"#201B2E", inkSoft:"#5A5270", paper:"#EFECF4", surface:"#FFFFFF",
  line:"#DAD5E4", teal:"#17635E", rose:"#C43A62", brass:"#A8761F", muted:"#9A93AC" };

const STAMM = {"lehrer": [{"id": "p00", "nachname": "Sawaneh", "vorname": "Ahmed", "kurz": "Ahmed", "satz": 60, "aktiv": true}, {"id": "p01", "nachname": "Qizmolli", "vorname": "Ariana", "kurz": "Ariana", "satz": 60, "aktiv": true}, {"id": "p02", "nachname": "Ammann", "vorname": "Benjamin", "kurz": "Benjamin", "satz": 60, "aktiv": true}, {"id": "p03", "nachname": "Schnüriger", "vorname": "Carmen", "kurz": "Carmen", "satz": 65, "aktiv": true}, {"id": "p04", "nachname": "Melian", "vorname": "Silvio", "kurz": "Cruzito", "satz": 70, "aktiv": true}, {"id": "p05", "nachname": "Giuralarocca", "vorname": "Céline", "kurz": "Céline", "satz": 60, "aktiv": true}, {"id": "p06", "nachname": "Gross", "vorname": "Deborah", "kurz": "Deborah", "satz": 60, "aktiv": true}, {"id": "p07", "nachname": "Stojkovic", "vorname": "Dijana", "kurz": "Dijana", "satz": 60, "aktiv": true}, {"id": "p08", "nachname": "Debrunner", "vorname": "Eliane", "kurz": "Eliane", "satz": 60, "aktiv": true}, {"id": "p09", "nachname": "Zuka", "vorname": "Granit", "kurz": "Granit", "satz": 65, "aktiv": true}, {"id": "p10", "nachname": "Pogorelova", "vorname": "Hanna", "kurz": "Hanna", "satz": 60, "aktiv": true}, {"id": "p11", "nachname": "Fernandez", "vorname": "Irlanda", "kurz": "Irlanda", "satz": 60, "aktiv": true}, {"id": "p12", "nachname": "Gungon", "vorname": "Jan", "kurz": "Jan Michael", "satz": 60, "aktiv": true}, {"id": "p13", "nachname": "Cehajic", "vorname": "Jasmin", "kurz": "Jasmin C.", "satz": 65, "aktiv": true}, {"id": "p14", "nachname": "Valsecchi", "vorname": "Jasmin", "kurz": "Jasmin V.", "satz": 60, "aktiv": true}, {"id": "p15", "nachname": "Altieri", "vorname": "Jonatan", "kurz": "Jonatan", "satz": 60, "aktiv": true}, {"id": "p16", "nachname": "Austen", "vorname": "Kiki", "kurz": "Kiki", "satz": 70, "aktiv": true}, {"id": "p17", "nachname": "Kouki", "vorname": "Wajdi", "kurz": "Kouki", "satz": 60, "aktiv": true}, {"id": "p18", "nachname": "Rojas", "vorname": "Loreto", "kurz": "Lore", "satz": 60, "aktiv": true}, {"id": "p19", "nachname": "Pisano", "vorname": "Loriana", "kurz": "Lori P.", "satz": 70, "aktiv": true}, {"id": "p20", "nachname": "Renn", "vorname": "Maja", "kurz": "Maja", "satz": 60, "aktiv": true}, {"id": "p21", "nachname": "Perren", "vorname": "Maurice", "kurz": "Maurice", "satz": 60, "aktiv": true}, {"id": "p22", "nachname": "Sager", "vorname": "Mirjam", "kurz": "Mirjam", "satz": 60, "aktiv": true}, {"id": "p23", "nachname": "Jeboo", "vorname": "Musa", "kurz": "Musa", "satz": 60, "aktiv": true}, {"id": "p24", "nachname": "Hauri", "vorname": "Nathalie", "kurz": "Nathalie", "satz": 60, "aktiv": true}, {"id": "p25", "nachname": "Keller", "vorname": "Noemi", "kurz": "Noemi", "satz": 60, "aktiv": true}, {"id": "p26", "nachname": "Sultan", "vorname": "Omar", "kurz": "Omar", "satz": 70, "aktiv": true}, {"id": "p27", "nachname": "Pisano", "vorname": "Mike", "kurz": "Popping Mike", "satz": 70, "aktiv": true}, {"id": "p28", "nachname": "Heldner", "vorname": "Sarah", "kurz": "Sarah H.", "satz": 60, "aktiv": true}, {"id": "p29", "nachname": "Schaarschmidt", "vorname": "Stefanie", "kurz": "Stefanie", "satz": 60, "aktiv": true}, {"id": "p30", "nachname": "Donaubauer", "vorname": "Uwe", "kurz": "Uwe", "satz": 80, "aktiv": true}, {"id": "p31", "nachname": "Benz", "vorname": "Vanessa", "kurz": "Vanessa", "satz": 60, "aktiv": true}, {"id": "p32", "nachname": "Sasdi", "vorname": "Vera", "kurz": "Vera", "satz": 80, "aktiv": true}, {"id": "p33", "nachname": "Chacon", "vorname": "Yolanda", "kurz": "Yolanda", "satz": 60, "aktiv": true}, {"id": "p34", "nachname": "?", "vorname": "Yurii", "kurz": "Yurii", "satz": 60, "aktiv": true}, {"id": "p35", "nachname": "Eggenschwiler", "vorname": "Zoë", "kurz": "Zoë E.", "satz": 60, "aktiv": true}], "kurse": [{"id": "c000", "tag": 1, "zeit": "17:00", "dauer": 85, "stil": "Breaking", "ort": "TFUD", "lehrerId": "p17", "ansatz": null, "tn": 8, "von": "2026-01-01", "bis": ""}, {"id": "c001", "tag": 1, "zeit": "20:00", "dauer": 85, "stil": "Afro", "ort": "TFUD", "lehrerId": "p00", "ansatz": 65, "tn": 8, "von": "2026-01-01", "bis": ""}, {"id": "c002", "tag": 2, "zeit": "15:00", "dauer": 55, "stil": "KidzDance", "ort": "TFUD", "lehrerId": "p33", "ansatz": null, "tn": 6, "von": "2026-01-01", "bis": ""}, {"id": "c003", "tag": 2, "zeit": "16:00", "dauer": 55, "stil": "KidzDance", "ort": "TFUD", "lehrerId": "p33", "ansatz": null, "tn": 6, "von": "2026-01-01", "bis": ""}, {"id": "c004", "tag": 2, "zeit": "17:00", "dauer": 55, "stil": "HipHop Fusion", "ort": "TFUD", "lehrerId": "p22", "ansatz": null, "tn": 18, "von": "2026-01-01", "bis": ""}, {"id": "c005", "tag": 2, "zeit": "18:00", "dauer": 55, "stil": "HipHop Fusion", "ort": "TFUD", "lehrerId": "p22", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c006", "tag": 2, "zeit": "19:00", "dauer": 55, "stil": "HipHop Fusion", "ort": "TFUD", "lehrerId": "p22", "ansatz": 65, "tn": 20, "von": "2026-01-01", "bis": ""}, {"id": "c007", "tag": 2, "zeit": "20:00", "dauer": 55, "stil": "APEX", "ort": "TFUD", "lehrerId": "p22", "ansatz": 65, "tn": 14, "von": "2026-01-01", "bis": ""}, {"id": "c008", "tag": 3, "zeit": "09:15", "dauer": 55, "stil": "Powerdance / Workout", "ort": "TFUD", "lehrerId": "p28", "ansatz": null, "tn": 9, "von": "2026-01-01", "bis": ""}, {"id": "c009", "tag": 3, "zeit": "13:30", "dauer": 55, "stil": "HipHop", "ort": "TFUD", "lehrerId": "p24", "ansatz": null, "tn": 13, "von": "2026-01-01", "bis": ""}, {"id": "c010", "tag": 3, "zeit": "14:30", "dauer": 55, "stil": "HipHop", "ort": "TFUD", "lehrerId": "p24", "ansatz": null, "tn": 9, "von": "2026-01-01", "bis": ""}, {"id": "c011", "tag": 3, "zeit": "19:00", "dauer": 85, "stil": "Hip Hop 'n'Contemp.", "ort": "TFUD", "lehrerId": "p03", "ansatz": null, "tn": 6, "von": "2026-01-01", "bis": ""}, {"id": "c012", "tag": 3, "zeit": "20:30", "dauer": 85, "stil": "Unison Crew", "ort": "TFUD", "lehrerId": "p03", "ansatz": null, "tn": 9, "von": "2026-01-01", "bis": ""}, {"id": "c013", "tag": 4, "zeit": "16:00", "dauer": 55, "stil": "Ballett", "ort": "TFUD", "lehrerId": "p10", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c014", "tag": 4, "zeit": "17:00", "dauer": 55, "stil": "Contemp&Modern", "ort": "TFUD", "lehrerId": "p10", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c015", "tag": 4, "zeit": "18:00", "dauer": 55, "stil": "Contemp&Modern", "ort": "TFUD", "lehrerId": "p10", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c016", "tag": 5, "zeit": "19:30", "dauer": 55, "stil": "Contemporary Teens", "ort": "TFUD", "lehrerId": "p08", "ansatz": null, "tn": 16, "von": "2026-01-01", "bis": ""}, {"id": "c017", "tag": 5, "zeit": "20:30", "dauer": 85, "stil": "Contemporary", "ort": "TFUD", "lehrerId": "p08", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c018", "tag": 1, "zeit": "16:00", "dauer": 55, "stil": "Breaking", "ort": "TFBG", "lehrerId": "p02", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c019", "tag": 1, "zeit": "17:00", "dauer": 55, "stil": "Breaking", "ort": "TFBG", "lehrerId": "p02", "ansatz": null, "tn": 13, "von": "2026-01-01", "bis": ""}, {"id": "c020", "tag": 1, "zeit": "18:00", "dauer": 85, "stil": "Academy - Low Gravity Crew -LGC", "ort": "TFBG", "lehrerId": "p02", "ansatz": 65, "tn": 6, "von": "2026-01-01", "bis": ""}, {"id": "c021", "tag": 1, "zeit": "19:30", "dauer": 55, "stil": "Powerdance", "ort": "TFBG", "lehrerId": "p28", "ansatz": null, "tn": 17, "von": "2026-01-01", "bis": ""}, {"id": "c022", "tag": 1, "zeit": "20:30", "dauer": 55, "stil": "Powerdance Choreo", "ort": "TFBG", "lehrerId": "p28", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c023", "tag": 2, "zeit": "18:00", "dauer": 55, "stil": "HipHop", "ort": "TFBG", "lehrerId": "p31", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c024", "tag": 2, "zeit": "19:00", "dauer": 55, "stil": "HipHop", "ort": "TFBG", "lehrerId": "p31", "ansatz": null, "tn": 20, "von": "2026-01-01", "bis": ""}, {"id": "c025", "tag": 2, "zeit": "20:00", "dauer": 55, "stil": "HipHop Fusion", "ort": "TFBG", "lehrerId": "p31", "ansatz": null, "tn": 6, "von": "2026-01-01", "bis": ""}, {"id": "c026", "tag": 3, "zeit": "09:00", "dauer": 85, "stil": "Contemporary 1.5h", "ort": "TFBG", "lehrerId": "p11", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c027", "tag": 3, "zeit": "17:00", "dauer": 55, "stil": "danceStyle", "ort": "TFBG", "lehrerId": "p14", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c028", "tag": 3, "zeit": "18:00", "dauer": 55, "stil": "Showdance", "ort": "TFBG", "lehrerId": "p14", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c029", "tag": 3, "zeit": "19:00", "dauer": 55, "stil": "Contemporary", "ort": "TFBG", "lehrerId": "p21", "ansatz": null, "tn": 13, "von": "2026-01-01", "bis": ""}, {"id": "c030", "tag": 3, "zeit": "20:00", "dauer": 85, "stil": "Contemporary 1.5h", "ort": "TFBG", "lehrerId": "p21", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c031", "tag": 4, "zeit": "16:00", "dauer": 55, "stil": "KidzDance", "ort": "TFBG", "lehrerId": "p11", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c032", "tag": 4, "zeit": "17:00", "dauer": 55, "stil": "Contemporary", "ort": "TFBG", "lehrerId": "p11", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c033", "tag": 4, "zeit": "19:00", "dauer": 55, "stil": "HipHop", "ort": "TFBG", "lehrerId": "p21", "ansatz": null, "tn": 16, "von": "2026-01-01", "bis": ""}, {"id": "c034", "tag": 4, "zeit": "20:00", "dauer": 55, "stil": "HipHop", "ort": "TFBG", "lehrerId": "p21", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c035", "tag": 5, "zeit": "14:00", "dauer": 55, "stil": "KidzDance", "ort": "TFBG", "lehrerId": "p11", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c036", "tag": 5, "zeit": "15:00", "dauer": 55, "stil": "KidzDance", "ort": "TFBG", "lehrerId": "p11", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c037", "tag": 5, "zeit": "16:00", "dauer": 55, "stil": "danceStyle", "ort": "TFBG", "lehrerId": "p11", "ansatz": null, "tn": 14, "von": "2026-01-01", "bis": ""}, {"id": "c038", "tag": 5, "zeit": "17:00", "dauer": 55, "stil": "danceStyle", "ort": "TFBG", "lehrerId": "p11", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c039", "tag": 5, "zeit": "18:00", "dauer": 55, "stil": "Breaking", "ort": "TFBG", "lehrerId": "p34", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c040", "tag": 5, "zeit": "19:00", "dauer": 55, "stil": "Breaking", "ort": "TFBG", "lehrerId": "p34", "ansatz": null, "tn": 13, "von": "2026-01-01", "bis": ""}, {"id": "c041", "tag": 5, "zeit": "20:00", "dauer": 85, "stil": "Breaking", "ort": "TFBG", "lehrerId": "p34", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c042", "tag": 6, "zeit": "13:00", "dauer": 85, "stil": "Academy - Revolution Crew", "ort": "TFBG", "lehrerId": "p13", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c043", "tag": 6, "zeit": "14:30", "dauer": 85, "stil": "Chili Crew", "ort": "TFBG", "lehrerId": "p13", "ansatz": null, "tn": 5, "von": "2026-01-01", "bis": ""}, {"id": "c044", "tag": 1, "zeit": "16:30", "dauer": 85, "stil": "Breaking", "ort": "TFWT", "lehrerId": "p26", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c045", "tag": 1, "zeit": "17:30", "dauer": 85, "stil": "Breaking", "ort": "TFWT", "lehrerId": "p26", "ansatz": null, "tn": 16, "von": "2026-01-01", "bis": ""}, {"id": "c046", "tag": 1, "zeit": "19:00", "dauer": 85, "stil": "Popping/Boogaloo", "ort": "TFWT", "lehrerId": "p27", "ansatz": null, "tn": 17, "von": "2026-01-01", "bis": ""}, {"id": "c047", "tag": 1, "zeit": "20:30", "dauer": 55, "stil": "Grooves and Moves", "ort": "TFWT", "lehrerId": "p27", "ansatz": null, "tn": 13, "von": "2026-01-01", "bis": ""}, {"id": "c048", "tag": 2, "zeit": "17:00", "dauer": 55, "stil": "HipHop", "ort": "TFWT", "lehrerId": "p19", "ansatz": null, "tn": 8, "von": "2026-01-01", "bis": ""}, {"id": "c049", "tag": 2, "zeit": "18:00", "dauer": 55, "stil": "HipHop", "ort": "TFWT", "lehrerId": "p19", "ansatz": null, "tn": 20, "von": "2026-01-01", "bis": ""}, {"id": "c050", "tag": 2, "zeit": "19:00", "dauer": 85, "stil": "HipHop", "ort": "TFWT", "lehrerId": "p19", "ansatz": null, "tn": 21, "von": "2026-01-01", "bis": ""}, {"id": "c051", "tag": 3, "zeit": "18:00", "dauer": 55, "stil": "HipHop", "ort": "TFWT", "lehrerId": "p24", "ansatz": null, "tn": 14, "von": "2026-01-01", "bis": ""}, {"id": "c052", "tag": 3, "zeit": "19:00", "dauer": 55, "stil": "HipHop Beginners", "ort": "TFWT", "lehrerId": "p06", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c053", "tag": 3, "zeit": "20:00", "dauer": 85, "stil": "Afro", "ort": "TFWT", "lehrerId": "p26", "ansatz": null, "tn": 15, "von": "2026-01-01", "bis": ""}, {"id": "c054", "tag": 4, "zeit": "16:30", "dauer": 55, "stil": "Breaking", "ort": "TFWT", "lehrerId": "p30", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c055", "tag": 4, "zeit": "17:30", "dauer": 85, "stil": "Breaking", "ort": "TFWT", "lehrerId": "p30", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c056", "tag": 4, "zeit": "19:00", "dauer": 85, "stil": "Dancehall", "ort": "TFWT", "lehrerId": "p19", "ansatz": null, "tn": 21, "von": "2026-01-01", "bis": ""}, {"id": "c057", "tag": 5, "zeit": "16:00", "dauer": 55, "stil": "KidzDance", "ort": "TFWT", "lehrerId": "p07", "ansatz": null, "tn": 18, "von": "2026-01-01", "bis": ""}, {"id": "c058", "tag": 5, "zeit": "17:00", "dauer": 55, "stil": "HipHop", "ort": "TFWT", "lehrerId": "p07", "ansatz": null, "tn": 16, "von": "2026-01-01", "bis": ""}, {"id": "c059", "tag": 5, "zeit": "18:00", "dauer": 85, "stil": "Crew", "ort": "TFWT", "lehrerId": "p07", "ansatz": 65, "tn": 14, "von": "2026-01-01", "bis": ""}, {"id": "c060", "tag": 5, "zeit": "19:30", "dauer": 55, "stil": "HipHop Beginners", "ort": "TFWT", "lehrerId": "p07", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c061", "tag": 1, "zeit": "16:00", "dauer": 55, "stil": "KidsDance", "ort": "TFLB", "lehrerId": "p11", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c062", "tag": 1, "zeit": "17:00", "dauer": 55, "stil": "Ballett", "ort": "TFLB", "lehrerId": "p11", "ansatz": null, "tn": 5, "von": "2026-01-01", "bis": ""}, {"id": "c063", "tag": 1, "zeit": "18:00", "dauer": 85, "stil": "Modern Dance", "ort": "TFLB", "lehrerId": "p11", "ansatz": null, "tn": 8, "von": "2026-01-01", "bis": ""}, {"id": "c064", "tag": 1, "zeit": "19:30", "dauer": 55, "stil": "Powerdance", "ort": "TFLB", "lehrerId": "p11", "ansatz": null, "tn": 5, "von": "2026-01-01", "bis": ""}, {"id": "c065", "tag": 2, "zeit": "19:30", "dauer": 85, "stil": "Ballett/Spitzen", "ort": "TFLB", "lehrerId": "p32", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c066", "tag": 3, "zeit": "13:30", "dauer": 55, "stil": "Ballett", "ort": "TFLB", "lehrerId": "p11", "ansatz": null, "tn": 17, "von": "2026-01-01", "bis": ""}, {"id": "c067", "tag": 3, "zeit": "14:30", "dauer": 55, "stil": "Ballett", "ort": "TFLB", "lehrerId": "p11", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c068", "tag": 3, "zeit": "15:30", "dauer": 55, "stil": "Ballett", "ort": "TFLB", "lehrerId": "p11", "ansatz": null, "tn": 5, "von": "2026-01-01", "bis": ""}, {"id": "c069", "tag": 3, "zeit": "18:00", "dauer": 85, "stil": "Contemporary", "ort": "TFLB", "lehrerId": "p11", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c070", "tag": 4, "zeit": "09:30", "dauer": 85, "stil": "Ballettwerkstatt", "ort": "TFLB", "lehrerId": "p32", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c071", "tag": 4, "zeit": "16:00", "dauer": 55, "stil": "Breaking", "ort": "TFLB", "lehrerId": "p09", "ansatz": null, "tn": 14, "von": "2026-01-01", "bis": ""}, {"id": "c072", "tag": 4, "zeit": "17:00", "dauer": 55, "stil": "Breaking", "ort": "TFLB", "lehrerId": "p09", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c073", "tag": 4, "zeit": "18:30", "dauer": 85, "stil": "Contemp./Jazz", "ort": "TFLB", "lehrerId": "p25", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c074", "tag": 4, "zeit": "20:00", "dauer": 85, "stil": "Contemp./Choreo", "ort": "TFLB", "lehrerId": "p25", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c075", "tag": 5, "zeit": "18:00", "dauer": 55, "stil": "HipHop", "ort": "TFLB", "lehrerId": "p12", "ansatz": null, "tn": 8, "von": "2026-01-01", "bis": ""}, {"id": "c076", "tag": 5, "zeit": "19:00", "dauer": 55, "stil": "HipHop", "ort": "TFLB", "lehrerId": "p12", "ansatz": null, "tn": 14, "von": "2026-01-01", "bis": ""}, {"id": "c077", "tag": 5, "zeit": "20:00", "dauer": 85, "stil": "HipHop", "ort": "TFLB", "lehrerId": "p12", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c078", "tag": 3, "zeit": "14:00", "dauer": 55, "stil": "Ballett", "ort": "TFSP", "lehrerId": "p01", "ansatz": null, "tn": 13, "von": "2026-01-01", "bis": ""}, {"id": "c079", "tag": 3, "zeit": "15:00", "dauer": 55, "stil": "Ballett", "ort": "TFSP", "lehrerId": "p01", "ansatz": null, "tn": 4, "von": "2026-01-01", "bis": ""}, {"id": "c080", "tag": 5, "zeit": "18:00", "dauer": 55, "stil": "HipHop", "ort": "TFSP", "lehrerId": "p23", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c081", "tag": 5, "zeit": "19:00", "dauer": 55, "stil": "HipHop", "ort": "TFSP", "lehrerId": "p23", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c082", "tag": 6, "zeit": "09:00", "dauer": 55, "stil": "Tumbling", "ort": "TFRS", "lehrerId": "p26", "ansatz": null, "tn": 14, "von": "2026-01-01", "bis": ""}, {"id": "c083", "tag": 6, "zeit": "10:00", "dauer": 55, "stil": "Tumbling", "ort": "TFRS", "lehrerId": "p26", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c084", "tag": 6, "zeit": "11:00", "dauer": 55, "stil": "Tumbling", "ort": "TFRS", "lehrerId": "p26", "ansatz": null, "tn": 10, "von": "2026-01-01", "bis": ""}, {"id": "c085", "tag": 1, "zeit": "16:25", "dauer": 85, "stil": "Groovy Dance Class", "ort": "TFKN", "lehrerId": "p20", "ansatz": null, "tn": 11, "von": "2026-01-01", "bis": ""}, {"id": "c086", "tag": 2, "zeit": "17:00", "dauer": 55, "stil": "HipHop", "ort": "TFKN", "lehrerId": "p15", "ansatz": null, "tn": 8, "von": "2026-01-01", "bis": ""}, {"id": "c087", "tag": 3, "zeit": "10:00", "dauer": 55, "stil": "Yoga", "ort": "TFKN", "lehrerId": "p18", "ansatz": null, "tn": 8, "von": "2026-01-01", "bis": ""}, {"id": "c088", "tag": 3, "zeit": "17:10", "dauer": 55, "stil": "KidsDance", "ort": "TFKN", "lehrerId": "p16", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c089", "tag": 3, "zeit": "19:15", "dauer": 55, "stil": "Zumba", "ort": "TFKN", "lehrerId": "p18", "ansatz": null, "tn": 15, "von": "2026-01-01", "bis": ""}, {"id": "c090", "tag": 4, "zeit": "17:00", "dauer": 55, "stil": "HipHop for Boys", "ort": "TFKN", "lehrerId": "p15", "ansatz": null, "tn": 6, "von": "2026-01-01", "bis": ""}, {"id": "c091", "tag": 4, "zeit": "18:00", "dauer": 55, "stil": "HipHop", "ort": "TFKN", "lehrerId": "p15", "ansatz": null, "tn": 7, "von": "2026-01-01", "bis": ""}, {"id": "c092", "tag": 5, "zeit": "17:15", "dauer": 55, "stil": "Contemporary", "ort": "TFKN", "lehrerId": "p35", "ansatz": null, "tn": 6, "von": "2026-01-01", "bis": ""}, {"id": "c093", "tag": 5, "zeit": "18:15", "dauer": 85, "stil": "Contemporary 1.5", "ort": "TFKN", "lehrerId": "p35", "ansatz": null, "tn": 12, "von": "2026-01-01", "bis": ""}, {"id": "c094", "tag": 1, "zeit": "18:30", "dauer": 85, "stil": "Contemporary", "ort": "TFZH", "lehrerId": "p29", "ansatz": null, "tn": 8, "von": "2026-01-01", "bis": ""}, {"id": "c095", "tag": 2, "zeit": "19:00", "dauer": 85, "stil": "Popping/Choreo", "ort": "TFZH", "lehrerId": "p04", "ansatz": null, "tn": 9, "von": "2026-01-01", "bis": ""}, {"id": "c096", "tag": 3, "zeit": "17:30", "dauer": 55, "stil": "HipHop", "ort": "TFZH", "lehrerId": "p05", "ansatz": null, "tn": 13, "von": "2026-01-01", "bis": ""}, {"id": "c097", "tag": 3, "zeit": "18:30", "dauer": 55, "stil": "Commercial Dance", "ort": "TFZH", "lehrerId": "p05", "ansatz": null, "tn": 23, "von": "2026-01-01", "bis": ""}, {"id": "c098", "tag": 3, "zeit": "19:30", "dauer": 55, "stil": "Heels", "ort": "TFZH", "lehrerId": "p05", "ansatz": null, "tn": 6, "von": "2026-01-01", "bis": ""}, {"id": "c099", "tag": 4, "zeit": "17:00", "dauer": 55, "stil": "Breaking", "ort": "TFZH", "lehrerId": "p26", "ansatz": null, "tn": 5, "von": "2026-01-01", "bis": ""}, {"id": "c100", "tag": 4, "zeit": "18:00", "dauer": 55, "stil": "Afro Beginners", "ort": "TFZH", "lehrerId": "p26", "ansatz": null, "tn": 5, "von": "2026-01-01", "bis": ""}, {"id": "c101", "tag": 4, "zeit": "19:00", "dauer": 55, "stil": "HipHop", "ort": "TFZH", "lehrerId": "p26", "ansatz": null, "tn": 14, "von": "2026-01-01", "bis": ""}, {"id": "c102", "tag": 4, "zeit": "20:00", "dauer": 85, "stil": "Afro", "ort": "TFZH", "lehrerId": "p26", "ansatz": null, "tn": 9, "von": "2026-01-01", "bis": ""}]};

const ORTE = { TFUD:"Urdorf", TFBG:"Bremgarten", TFWT:"Winterthur", TFLB:"Lenzburg",
  TFSP:"Spreitenbach", TFRS:"Rudolfstetten", TFKN:"Küsnacht", TFZH:"Zürich" };
const TAGE = ["", "Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const LOHNSTUNDEN = { 55: 1.0, 85: 1.5 };
const ZUSATZ_TYPEN = ["Spesen", "Abzug"];       // manuell, ohne Einschreibung
const ANLASS_TYPEN = ["Workshop", "Camp", "Auftritt"]; // datiert, mit Einschreibung

const HEUTE = new Date("2026-07-15T12:00:00");
const MONATE = [ {key:"2026-06",label:"Juni 2026"}, {key:"2026-07",label:"Juli 2026"}, {key:"2026-08",label:"August 2026"} ];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const datumLabel = (d) => new Date(d+"T12:00").toLocaleDateString("de-CH",{weekday:"short",day:"2-digit",month:"2-digit"});
const chf = (n) => n.toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2});
const kw = (d) => { const dt=new Date(d+"T12:00"); const t=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate()));
  t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7)); return Math.ceil(((t-new Date(Date.UTC(t.getUTCFullYear(),0,1)))/86400000+1)/7); };

/* ---------------------------- UI ---------------------------- */
const selStil = { padding:"6px 9px", borderRadius:6, border:`1px solid ${C.line}`, background:C.surface,
  color:C.ink, fontSize:13, fontFamily:"inherit" };
const karte = { display:"flex", gap:12, alignItems:"center", background:C.surface,
  border:`1px solid ${C.line}`, borderRadius:10, padding:12 };

const Tag = ({text,farbe}) => <span style={{fontSize:11,letterSpacing:0.4,textTransform:"uppercase",color:farbe,
  border:`1px solid ${farbe}33`,background:`${farbe}0F`,padding:"2px 7px",borderRadius:4,fontWeight:600,whiteSpace:"nowrap"}}>{text}</span>;

const Knopf = ({children,onClick,variante="still",klein}) => {
  const s = { voll:{background:C.ink,color:"#fff",border:`1px solid ${C.ink}`},
    still:{background:"transparent",color:C.inkSoft,border:`1px solid ${C.line}`},
    warn:{background:"transparent",color:C.rose,border:`1px solid ${C.rose}55`} }[variante];
  return <button onClick={onClick} style={{...s,padding:klein?"5px 9px":"8px 14px",borderRadius:6,
    fontSize:klein?12:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>{children}</button>;
};

const Titel = ({children,klein,style}) => <h2 className="serif" style={{fontSize:klein?21:26,fontWeight:400,margin:"0 0 14px",...style}}>{children}</h2>;

const Kennzahl = ({label,wert,warn}) => <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,padding:"12px 18px",minWidth:140}}>
  <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:0.6,color:C.inkSoft}}>{label}</div>
  <div className="mono" style={{fontSize:22,fontWeight:600,color:warn&&wert!==0?C.rose:C.ink}}>{wert}</div></div>;

/* ---------------------------- App ---------------------------- */

export default function App() {
  const [lehrer, setLehrer] = useState(() => {
    const basis = STAMM.lehrer.map((p) => ({
      ...p, r_lehrer:true, r_anlaesse:false, r_lohn:false, r_admin:false,
      vertretungssatz: 60,
      ...(p.nachname === "Heldner" ? { r_admin:true, r_lohn:true, r_anlaesse:true } : {}),
    }));
    // Zwei reine Büro-Personen zur Demonstration der Rollen ohne eigene Stunden
    basis.push({ id:"x1", vorname:"Petra", nachname:"(Backoffice)", kurz:"Petra", satz:0, vertretungssatz:0,
      r_lehrer:false, r_anlaesse:false, r_lohn:true, r_admin:false, aktiv:true });
    basis.push({ id:"x2", vorname:"Nina", nachname:"(Anlässe)", kurz:"Nina", satz:0, vertretungssatz:0,
      r_lehrer:false, r_anlaesse:true, r_lohn:false, r_admin:false, aktiv:true });
    return basis;
  });
  const [kurse, setKurse] = useState(STAMM.kurse);
  const [ov, setOv] = useState({});            // lektionId -> {istLehrer,status,bemerkung}
  const [zusatz, setZusatz] = useState([
    { id:"z2", lehrerId:"p28", monat:"2026-06", typ:"Abzug", betrag:-350, text:"Lohnvorschuss" },
  ]);
  const [anlaesse, setAnlaesse] = useState([
    { id:"a1", datum:"2026-07-19", zeit:"14:00", titel:"Breakdance Workshop", ort:"TFBG", typ:"Workshop", pauschale:180, lehrerId:null, status:"offen" },
    { id:"a2", datum:"2026-07-25", zeit:"10:00", titel:"Sommer-Camp Tag 1", ort:"TFUD", typ:"Camp", pauschale:320, lehrerId:"p11", status:"geplant" },
  ]);
  const [vertretungssatz, setVertretungssatz] = useState(60); // Vorgabe für neue Personen
  const [ansicht, setAnsicht] = useState("lehrer");
  const [monat, setMonat] = useState("2026-07");
  const [rolle, setRolle] = useState("p11");   // = "angemeldet als"
  const [demoVoll, setDemoVoll] = useState(true); // Prototyp: alle Tabs sichtbar
  const [filterOrt, setFilterOrt] = useState("");
  const [ferienKw, setFerienKw] = useState(""); const [ferienOrt, setFerienOrt] = useState("");
  const [abwesend, setAbwesend] = useState(null); // {von, bis} oder null
  const [abwVon, setAbwVon] = useState(""); const [abwBis, setAbwBis] = useState("");
  const [neuerKurs, setNeuerKurs] = useState({ tag:1, zeit:"18:00", dauer:55, stil:"", ort:"TFBG", lehrerId:lehrer[0].id, ansatz:"", von:iso(HEUTE), bis:"" });
  const [neuerLehrer, setNeuerLehrer] = useState({ vorname:"", nachname:"", satz:60, vertretungssatz:60, r_lehrer:true, r_anlaesse:false, r_lohn:false, r_admin:false });
  const [neueZusatz, setNeueZusatz] = useState({ lehrerId:lehrer[0].id, typ:"Spesen", betrag:"", text:"" });
  const [neuerAnlass, setNeuerAnlass] = useState({ datum:iso(HEUTE), zeit:"14:00", titel:"", ort:"TFBG", typ:"Workshop", pauschale:"", lehrerId:"" });
  const [absVon, setAbsVon] = useState(""); const [absBis, setAbsBis] = useState(""); const [absLehrer, setAbsLehrer] = useState("");

  const P = (id) => lehrer.find((l) => l.id === id);
  const K = (id) => kurse.find((k) => k.id === id);
  const name = (id) => { const p = P(id); return p ? `${p.vorname} ${p.nachname}` : "—"; };
  const lehrpersonen = lehrer.filter((p) => p.r_lehrer); // für Kurs-/Stundenzuteilung

  // Rechte der aktuell angemeldeten Person (Demo-Vollzugriff hebt alles auf)
  const R = P(rolle) || {};
  const darfLohn     = demoVoll || R.r_lohn || R.r_admin;
  const darfAnlaesse = demoVoll || R.r_anlaesse || R.r_admin;
  const darfAdmin    = demoVoll || R.r_admin;
  const darfLehrer   = demoVoll || R.r_lehrer;
  const vSatz = (id) => { const p = P(id); return (p && p.vertretungssatz != null) ? p.vertretungssatz : vertretungssatz; };

  /* Lektionen werden abgeleitet, nicht gespeichert */
  const lektionen = useMemo(() => {
    const [j, m] = monat.split("-").map(Number);
    const tage = new Date(j, m, 0).getDate();
    const out = [];
    for (let t = 1; t <= tage; t++) {
      const d = new Date(j, m - 1, t, 12); const datum = iso(d);
      const wt = d.getDay() === 0 ? 7 : d.getDay();
      kurse.filter((k) => k.tag === wt && k.von <= datum && (!k.bis || k.bis >= datum)).forEach((k) => {
        const id = `${k.id}-${datum}`; const o = ov[id] || {};
        out.push({ id, kursId: k.id, datum,
          sollLehrer: k.lehrerId,
          istLehrer: "istLehrer" in o ? o.istLehrer : k.lehrerId,
          status: o.status || "geplant", bemerkung: o.bemerkung || "" });
      });
    }
    return out.sort((a,b) => a.datum.localeCompare(b.datum) || K(a.kursId).zeit.localeCompare(K(b.kursId).zeit));
  }, [kurse, ov, monat]);

  const setOvF = (id, d) => setOv((p) => ({ ...p, [id]: { ...(p[id]||{}), ...d } }));

  const istVertretung = (l) => l.istLehrer && l.istLehrer !== l.sollLehrer;
  const vergangen = (l) => new Date(l.datum+"T23:59") < HEUTE;
  const unbest = (l) => l.status === "geplant" && vergangen(l) && l.istLehrer;
  const relevant = (l) => l.status !== "ausgefallen" && l.istLehrer && (l.status === "gehalten" || unbest(l));
  const std = (l) => LOHNSTUNDEN[K(l.kursId).dauer] || 1;
  const satz = (l) => !l.istLehrer ? 0 : istVertretung(l) ? vSatz(l.istLehrer) : (K(l.kursId).ansatz || P(l.istLehrer).satz);
  const lohn = (l) => relevant(l) ? std(l) * satz(l) : 0;

  const zusatzMonat = zusatz.filter((z) => z.monat === monat);
  const anlaesseMonat = anlaesse.filter((a) => a.datum.startsWith(monat));
  const anlassVergangen = (a) => new Date(a.datum+"T23:59") < HEUTE;
  const anlassUnbest = (a) => a.status === "geplant" && anlassVergangen(a) && a.lehrerId;
  const anlassRelevant = (a) => a.status !== "ausgefallen" && a.lehrerId && (a.status === "gehalten" || anlassUnbest(a));

  // Bestätigte Anlässe erscheinen automatisch als Zusatzposition (nicht löschbar)
  const anlassAlsZusatz = anlaesseMonat.filter(anlassRelevant).map((a) => ({
    id:"anl-"+a.id, lehrerId:a.lehrerId, monat, typ:a.typ, betrag:a.pauschale,
    text:`${a.titel} · ${datumLabel(a.datum)}`, auto:true }));
  const alleZusatz = [...zusatzMonat, ...anlassAlsZusatz];

  const auswertung = useMemo(() => lehrer.map((p) => {
    const eig = lektionen.filter((l) => l.istLehrer === p.id && relevant(l));
    const norm = eig.filter((l) => !istVertretung(l)), vert = eig.filter(istVertretung);
    const zz = alleZusatz.filter((z) => z.lehrerId === p.id);
    const sum = (a) => a.reduce((s,l) => s+std(l), 0);
    return { p, stdNormal: sum(norm), stdVert: sum(vert),
      lohnStd: eig.reduce((s,l) => s+lohn(l), 0),
      zusatz: zz.reduce((s,z) => s+Number(z.betrag), 0),
      unbest: lektionen.filter((l) => l.istLehrer === p.id && unbest(l)).length
             + anlaesseMonat.filter((a) => a.lehrerId === p.id && anlassUnbest(a)).length };
  }).map((a) => ({ ...a, total: a.lohnStd + a.zusatz }))
    .filter((a) => a.stdNormal + a.stdVert !== 0 || a.zusatz !== 0), [lektionen, lehrer, zusatz, anlaesse, monat, vertretungssatz]);

  const offene = lektionen.filter((l) => !l.istLehrer && l.status !== "ausgefallen");
  const offeneAnlaesse = anlaesseMonat.filter((a) => !a.lehrerId && a.status !== "ausgefallen");
  const meineAnlaesse = anlaesseMonat.filter((a) => a.lehrerId === rolle);
  const totalLohn = auswertung.reduce((s,a) => s+a.total, 0);
  const meine = lektionen.filter((l) => l.istLehrer === rolle || (l.sollLehrer === rolle && !l.istLehrer));
  const wochen = [...new Set(lektionen.map((l) => kw(l.datum)))].sort((a,b) => a-b);

  function absenzMelden(lehrerId, von, bis) {
    if (!von || !bis || !lehrerId) return;
    const upd = { ...ov }; let n = 0;
    lektionen.forEach((l) => {
      if (l.istLehrer === lehrerId && l.datum >= von && l.datum <= bis && l.status !== "ausgefallen" && !vergangen(l)) {
        upd[l.id] = { ...(upd[l.id]||{}), istLehrer:null }; n++;
      }
    });
    setOv(upd);
    return n;
  }
  function anlassSetzen(id, d) { setAnlaesse((p) => p.map((a) => a.id === id ? { ...a, ...d } : a)); }
  function anlassHinzu() {
    if (!neuerAnlass.titel) return;
    setAnlaesse((p) => [...p, { ...neuerAnlass, id:"a"+Date.now(), pauschale:Number(neuerAnlass.pauschale)||0,
      lehrerId: neuerAnlass.lehrerId || null, status: neuerAnlass.lehrerId ? "geplant" : "offen" }]);
    setNeuerAnlass({ ...neuerAnlass, titel:"", pauschale:"" });
  }

  function ferienSetzen() {
    if (!ferienKw) return;
    const upd = { ...ov };
    lektionen.forEach((l) => { if (kw(l.datum) === Number(ferienKw) && (!ferienOrt || K(l.kursId).ort === ferienOrt))
      upd[l.id] = { ...(upd[l.id]||{}), status:"ausgefallen", bemerkung:"Ferienwoche" }; });
    setOv(upd);
  }

  function kursAendern(id, d) { setKurse((p) => p.map((k) => k.id === id ? { ...k, ...d } : k)); }
  function kursHinzu() {
    if (!neuerKurs.stil) return;
    setKurse((p) => [...p, { ...neuerKurs, id:"c"+Date.now(), dauer:Number(neuerKurs.dauer),
      tag:Number(neuerKurs.tag), ansatz: neuerKurs.ansatz ? Number(neuerKurs.ansatz) : null, tn:0 }]);
    setNeuerKurs({ ...neuerKurs, stil:"" });
  }
  function lehrerHinzu() {
    if (!neuerLehrer.vorname) return;
    setLehrer((p) => [...p, { ...neuerLehrer, id:"p"+Date.now(),
      satz:Number(neuerLehrer.satz), vertretungssatz:Number(neuerLehrer.vertretungssatz),
      kurz:neuerLehrer.vorname, aktiv:true }]);
    setNeuerLehrer({ vorname:"", nachname:"", satz:60, vertretungssatz:60, r_lehrer:true, r_anlaesse:false, r_lohn:false, r_admin:false });
  }
  function zusatzHinzu() {
    if (!neueZusatz.betrag) return;
    setZusatz((p) => [...p, { ...neueZusatz, id:"z"+Date.now(), monat, betrag:Number(neueZusatz.betrag) }]);
    setNeueZusatz({ ...neueZusatz, betrag:"", text:"" });
  }

  function exportieren() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auswertung.map((a) => ({
      Name:a.p.nachname, Vorname:a.p.vorname, "Std.":a.stdNormal, "Lohn Std.":Number(a.lohnStd.toFixed(2)),
      "Std. Vertretung":a.stdVert, "Satz Vertretung":a.p.vertretungssatz,
      "Zusatz/Abzug":a.zusatz, "Total CHF":Number(a.total.toFixed(2)), "Unbestätigt":a.unbest,
    }))), "Zusammenfassung");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lektionen.map((l) => { const k = K(l.kursId);
      return { Datum:l.datum, Standort:ORTE[k.ort], Zeit:k.zeit, Kurs:k.stil, Minuten:k.dauer, Lohnstunden:std(l),
        "Soll":name(l.sollLehrer), "Ist":l.istLehrer?name(l.istLehrer):"OFFEN", Vertretung:istVertretung(l)?"ja":"",
        Status:unbest(l)?"unbestätigt":l.status, Satz:satz(l), "Lohn CHF":Number(lohn(l).toFixed(2)), Bemerkung:l.bemerkung };
    })), "Lektionen");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alleZusatz.map((z) => ({
      Name:name(z.lehrerId), Typ:z.typ, Betrag:z.betrag, Bemerkung:z.text,
      Herkunft: z.auto ? "Anlass" : "manuell" }))), "Zusatzpositionen");
    XLSX.writeFile(wb, `Lehrerabrechnung_${monat}.xlsx`);
  }

  const gefiltert = lektionen.filter((l) => !filterOrt || K(l.kursId).ort === filterOrt);

  return (
    <div style={{background:C.paper,minHeight:"100vh",color:C.ink,fontFamily:"'Inter', system-ui, sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid ${C.ink}; outline-offset: 1px; }
        .mono { font-family:'JetBrains Mono',ui-monospace,monospace; font-variant-numeric: tabular-nums; }
        .serif { font-family:'Instrument Serif',Georgia,serif; }
        table { border-collapse: collapse; width: 100%; }
        th,td { text-align:left; padding:8px 10px; border-bottom:1px solid ${C.line}; font-size:13px; }
        th { font-size:11px; text-transform:uppercase; letter-spacing:0.6px; color:${C.inkSoft}; font-weight:600; position:sticky; top:0; background:${C.surface}; z-index:1; }
        input,select { font-family:inherit; }
      `}</style>

      <div style={{borderBottom:`1px solid ${C.line}`,background:C.surface}}>
        <div style={{maxWidth:1180,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
          <div className="serif" style={{fontSize:27,lineHeight:1}}>Stundenbuch</div>
          <div style={{fontSize:12,color:C.inkSoft}}>Tanz-Fabrik · Prototyp · Stand 15.07.2026</div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <select value={monat} onChange={(e)=>setMonat(e.target.value)} style={selStil}>
              {MONATE.map((m)=><option key={m.key} value={m.key}>{m.label}</option>)}</select>
            <select value={ansicht} onChange={(e)=>setAnsicht(e.target.value)} style={selStil}>
              {darfLehrer && <option value="lehrer">Meine Stunden</option>}
              {darfLehrer && <option value="offen">Offene Stunden</option>}
              {darfLohn && <option value="backoffice">Abrechnung</option>}
              {darfAdmin && <option value="kurse">Kurse verwalten</option>}
              {darfAnlaesse && <option value="anlaesse">Anlässe verwalten</option>}
              {darfAdmin && <option value="personen">Personen &amp; Rollen</option>}
            </select>
            <span style={{display:"flex",alignItems:"center",gap:6,borderLeft:`1px solid ${C.line}`,paddingLeft:8}}>
              <span style={{fontSize:11,color:C.inkSoft}}>angemeldet als</span>
              <select value={rolle} onChange={(e)=>setRolle(e.target.value)} style={selStil}>
                {lehrer.filter(l=>l.aktiv).map((l)=><option key={l.id} value={l.id}>{l.vorname} {l.nachname}</option>)}</select>
            </span>
            <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.inkSoft,cursor:"pointer"}} title="Prototyp: zeigt alle Tabs unabhängig von der Rolle">
              <input type="checkbox" checked={demoVoll} onChange={(e)=>setDemoVoll(e.target.checked)}/> Demo: alles sehen
            </label>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1180,margin:"0 auto",padding:"20px 20px 60px"}}>

        {(() => {
          const erlaubt = { lehrer:darfLehrer, offen:darfLehrer, backoffice:darfLohn,
            kurse:darfAdmin, anlaesse:darfAnlaesse, personen:darfAdmin };
          if (!erlaubt[ansicht]) return (
            <div style={{...karte,justifyContent:"center",flexDirection:"column",padding:40,textAlign:"center",gap:8}}>
              <strong style={{fontSize:15}}>Kein Zugriff</strong>
              <span style={{color:C.inkSoft,fontSize:13}}>Für diesen Bereich fehlt {name(rolle)} die Berechtigung.</span>
              <span style={{color:C.muted,fontSize:12}}>Zum Testen oben «Demo: alles sehen» aktivieren oder die Rolle wechseln.</span>
            </div>);
          return null;
        })()}

        {/* -------- Lehrer -------- */}
        {ansicht==="lehrer" && darfLehrer && (<>
          <Titel>Meine Stunden · {name(rolle)}</Titel>

          <div style={{...karte,gap:8,flexWrap:"wrap",marginBottom:16,background:"#FBFAFD"}}>
            <strong style={{fontSize:13}}>Abwesenheit melden</strong>
            <span style={{fontSize:12,color:C.inkSoft}}>von</span>
            <input type="date" value={absVon} onChange={(e)=>setAbsVon(e.target.value)} style={selStil}/>
            <span style={{fontSize:12,color:C.inkSoft}}>bis</span>
            <input type="date" value={absBis} onChange={(e)=>setAbsBis(e.target.value)} style={selStil}/>
            <Knopf variante="warn" onClick={()=>{ const n=absenzMelden(rolle,absVon,absBis);
              if(n!=null) alert(`${n} Stunde(n) freigegeben. Sie erscheinen jetzt unter «Offene Stunden».`); setAbsVon("");setAbsBis(""); }}>
              Stunden freigeben</Knopf>
            <span style={{fontSize:12,color:C.inkSoft}}>Alle deine Stunden im Zeitraum werden für Vertretungen freigegeben.</span>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {meine.length===0 && <div style={{...karte,justifyContent:"center",color:C.inkSoft,padding:26}}>Keine Stunden in diesem Monat.</div>}
            {meine.map((l)=>{ const k=K(l.kursId); return (
              <div key={l.id} style={karte}>
                <div style={{width:4,borderRadius:2,alignSelf:"stretch",minHeight:32,flexShrink:0,
                  background: l.status==="ausgefallen"?C.line : (!l.istLehrer||unbest(l))?C.rose : l.status==="gehalten"?(istVertretung(l)?C.brass:C.teal):C.muted}}/>
                <div style={{flex:1,minWidth:0,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span className="mono" style={{fontSize:13,color:C.inkSoft}}>{datumLabel(l.datum)} · {k.zeit}</span>
                  <strong style={{fontSize:14}}>{k.stil}</strong>
                  <span style={{fontSize:12,color:C.inkSoft}}>{ORTE[k.ort]} · {k.dauer}′ · CHF {satz(l)}.–</span>
                  {istVertretung(l) && <Tag text="Vertretung" farbe={C.brass}/>}
                  {l.status==="gehalten" && <Tag text="Gehalten" farbe={C.teal}/>}
                  {l.status==="ausgefallen" && <Tag text={l.bemerkung||"Fällt aus"} farbe={C.muted}/>}
                  {unbest(l) && <Tag text="Noch offen" farbe={C.rose}/>}
                  {!l.istLehrer && <Tag text="Ausgetragen · Vertretung gesucht" farbe={C.rose}/>}
                </div>
                <div style={{display:"flex",gap:6}}>
                  {l.status==="geplant" && vergangen(l) && l.istLehrer && <Knopf klein variante="voll" onClick={()=>setOvF(l.id,{status:"gehalten"})}>Gehalten</Knopf>}
                  {!l.istLehrer && <Knopf klein onClick={()=>setOvF(l.id,{istLehrer:rolle})}>Doch übernehmen</Knopf>}
                  {l.istLehrer && l.status!=="ausgefallen" && !vergangen(l) && <Knopf klein variante="warn" onClick={()=>setOvF(l.id,{istLehrer:null})}>Kann nicht</Knopf>}
                  {l.istLehrer && l.status!=="ausgefallen" && vergangen(l) && <Knopf klein variante="warn" onClick={()=>setOvF(l.id,{istLehrer:null,status:"geplant"})}>Doch nicht gegeben</Knopf>}
                </div>
              </div>); })}
          </div>

          {meineAnlaesse.length>0 && (<>
            <Titel klein style={{marginTop:24}}>Meine Anlässe</Titel>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {meineAnlaesse.map((a)=>(
                <div key={a.id} style={karte}>
                  <div style={{width:4,borderRadius:2,alignSelf:"stretch",minHeight:32,flexShrink:0,
                    background: a.status==="gehalten"?C.teal : anlassUnbest(a)?C.rose : C.brass}}/>
                  <div style={{flex:1,minWidth:0,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span className="mono" style={{fontSize:13,color:C.inkSoft}}>{datumLabel(a.datum)} · {a.zeit}</span>
                    <strong style={{fontSize:14}}>{a.titel}</strong>
                    <Tag text={a.typ} farbe={C.brass}/>
                    <span style={{fontSize:12,color:C.inkSoft}}>{ORTE[a.ort]} · Pauschale CHF {a.pauschale}.–</span>
                    {a.status==="gehalten" && <Tag text="Bestätigt" farbe={C.teal}/>}
                    {anlassUnbest(a) && <Tag text="Noch offen" farbe={C.rose}/>}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {a.status==="geplant" && anlassVergangen(a) && <Knopf klein variante="voll" onClick={()=>anlassSetzen(a.id,{status:"gehalten"})}>Gehalten</Knopf>}
                    {a.status!=="ausgefallen" && !anlassVergangen(a) && <Knopf klein variante="warn" onClick={()=>anlassSetzen(a.id,{lehrerId:null,status:"offen"})}>Absagen</Knopf>}
                  </div>
                </div>))}
            </div>
          </>)}
        </>)}

        {/* -------- Offene -------- */}
        {ansicht==="offen" && darfLehrer && (<>
          <Titel>Offene Stunden</Titel>
          <p style={{color:C.inkSoft,fontSize:13,marginTop:-6,marginBottom:16}}>
            Vertretungen werden mit dem persönlichen Vertretungssatz der einspringenden Person abgerechnet.</p>
          {offene.length===0 && <div style={{...karte,justifyContent:"center",color:C.inkSoft,padding:26}}>Alle Stunden sind besetzt.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {offene.map((l)=>{ const k=K(l.kursId); return (
              <div key={l.id} style={karte}>
                <div style={{width:4,borderRadius:2,background:C.rose,alignSelf:"stretch",minHeight:32}}/>
                <div style={{flex:1}}>
                  <div className="mono" style={{fontSize:13,color:C.inkSoft}}>{datumLabel(l.datum)} · {k.zeit}</div>
                  <strong style={{fontSize:14}}>{k.stil}</strong>
                  <span style={{fontSize:12,color:C.inkSoft}}> · {ORTE[k.ort]} · {k.dauer}′ · sonst {name(l.sollLehrer)}</span>
                </div>
                <select defaultValue="" onChange={(e)=>e.target.value&&setOvF(l.id,{istLehrer:e.target.value})} style={selStil}>
                  <option value="">Übernehmen …</option>
                  {lehrpersonen.filter((p)=>p.aktiv&&p.id!==l.sollLehrer).map((p)=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}
                </select>
              </div>); })}
          </div>

          <Titel klein style={{marginTop:24}}>Offene Anlässe</Titel>
          <p style={{color:C.inkSoft,fontSize:13,marginTop:-6,marginBottom:14}}>
            Workshops, Camps und Auftritte, für die noch jemand gesucht wird. Pauschale pro Anlass.</p>
          {offeneAnlaesse.length===0 && <div style={{...karte,justifyContent:"center",color:C.inkSoft,padding:22}}>Keine offenen Anlässe.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {offeneAnlaesse.map((a)=>(
              <div key={a.id} style={karte}>
                <div style={{width:4,borderRadius:2,background:C.brass,alignSelf:"stretch",minHeight:32}}/>
                <div style={{flex:1}}>
                  <div className="mono" style={{fontSize:13,color:C.inkSoft}}>{datumLabel(a.datum)} · {a.zeit}</div>
                  <strong style={{fontSize:14}}>{a.titel}</strong>
                  <span style={{fontSize:12,color:C.inkSoft}}> · {a.typ} · {ORTE[a.ort]} · CHF {a.pauschale}.–</span>
                </div>
                <select defaultValue="" onChange={(e)=>e.target.value&&anlassSetzen(a.id,{lehrerId:e.target.value,status:"geplant"})} style={selStil}>
                  <option value="">Eintragen …</option>
                  {lehrpersonen.filter((p)=>p.aktiv).map((p)=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}
                </select>
              </div>))}
          </div>
        </>)}

        {/* -------- Abrechnung -------- */}
        {ansicht==="backoffice" && darfLohn && (<>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <Titel>Abrechnung {MONATE.find(m=>m.key===monat).label}</Titel>
            <div style={{marginLeft:"auto",marginBottom:14}}><Knopf variante="voll" onClick={exportieren}>Excel exportieren</Knopf></div>
          </div>
          <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
            <Kennzahl label="Total Ausgaben" wert={`CHF ${chf(totalLohn)}`}/>
            <Kennzahl label="Unbestätigt" wert={auswertung.reduce((s,a)=>s+a.unbest,0)} warn/>
            <Kennzahl label="Offene Stunden" wert={offene.length} warn/>
            <Kennzahl label="Lektionen" wert={lektionen.length}/>
          </div>

          <div style={{...karte,marginBottom:14,gap:8,flexWrap:"wrap"}}>
            <strong style={{fontSize:13}}>Ferienwoche</strong>
            <select value={ferienKw} onChange={(e)=>setFerienKw(e.target.value)} style={selStil}>
              <option value="">KW …</option>{wochen.map(w=><option key={w} value={w}>KW {w}</option>)}</select>
            <select value={ferienOrt} onChange={(e)=>setFerienOrt(e.target.value)} style={selStil}>
              <option value="">Alle Standorte</option>{Object.entries(ORTE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
            <Knopf onClick={ferienSetzen}>Stunden streichen</Knopf>
            <span style={{fontSize:12,color:C.inkSoft}}>Gestrichene Stunden werden nicht vergütet.</span>
            <span style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}} title="Vorgabe für neue Personen. Der tatsächliche Satz steht pro Person unter «Personen & Rollen».">
              <span style={{fontSize:13,fontWeight:600}}>Vertretungssatz (Vorgabe)</span>
              <input type="number" value={vertretungssatz} onChange={(e)=>setVertretungssatz(Number(e.target.value))} className="mono" style={{...selStil,width:75}}/>
            </span>
          </div>

          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,overflow:"hidden",marginBottom:24}}>
            <table>
              <thead><tr><th>Lehrer</th><th>Std.</th><th>Lohn Std.</th><th>Std. Vertr.</th><th>Zusatz/Abzug</th><th>Total CHF</th><th>Unbest.</th></tr></thead>
              <tbody>{auswertung.map((a)=>(
                <tr key={a.p.id}>
                  <td style={{fontWeight:600}}>{a.p.nachname}, {a.p.vorname}</td>
                  <td className="mono">{a.stdNormal.toFixed(1)}</td>
                  <td className="mono">{chf(a.lohnStd)}</td>
                  <td className="mono">{a.stdVert>0?a.stdVert.toFixed(1):"–"}</td>
                  <td className="mono" style={{color:a.zusatz<0?C.rose:a.zusatz>0?C.teal:C.muted}}>{a.zusatz?chf(a.zusatz):"–"}</td>
                  <td className="mono" style={{fontWeight:600}}>{chf(a.total)}</td>
                  <td className="mono" style={{color:a.unbest?C.rose:C.muted}}>{a.unbest||"–"}</td>
                </tr>))}
                <tr style={{background:C.paper}}>
                  <td style={{fontWeight:700}}>Total</td><td colSpan={4}></td>
                  <td className="mono" style={{fontWeight:700}}>{chf(totalLohn)}</td><td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <Titel klein>Zusatzpositionen</Titel>
          <p style={{color:C.inkSoft,fontSize:13,marginTop:-10,marginBottom:12}}>
            Bestätigte Anlässe erscheinen automatisch. Manuell nur Spesen und Abzüge (Abzug = negativer Betrag).</p>
          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,overflow:"hidden",marginBottom:10}}>
            <table>
              <thead><tr><th>Lehrer</th><th>Typ</th><th>Betrag</th><th>Bemerkung</th><th></th></tr></thead>
              <tbody>{alleZusatz.map((z)=>(
                <tr key={z.id}><td>{name(z.lehrerId)}</td>
                  <td>{z.typ} {z.auto && <span style={{fontSize:11,color:C.brass}}>· aus Anlass</span>}</td>
                  <td className="mono" style={{color:z.betrag<0?C.rose:C.ink}}>{chf(z.betrag)}</td><td style={{color:C.inkSoft}}>{z.text}</td>
                  <td>{z.auto ? <span style={{fontSize:12,color:C.muted}}>automatisch</span>
                    : <Knopf klein variante="warn" onClick={()=>setZusatz(p=>p.filter(x=>x.id!==z.id))}>Löschen</Knopf>}</td></tr>))}
                {alleZusatz.length===0 && <tr><td colSpan={5} style={{color:C.muted}}>Keine Positionen.</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{...karte,gap:8,flexWrap:"wrap",marginBottom:24}}>
            <select value={neueZusatz.lehrerId} onChange={(e)=>setNeueZusatz({...neueZusatz,lehrerId:e.target.value})} style={selStil}>
              {lehrpersonen.map(p=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}</select>
            <select value={neueZusatz.typ} onChange={(e)=>setNeueZusatz({...neueZusatz,typ:e.target.value})} style={selStil}>
              {ZUSATZ_TYPEN.map(t=><option key={t}>{t}</option>)}</select>
            <input type="number" placeholder="Betrag" value={neueZusatz.betrag} onChange={(e)=>setNeueZusatz({...neueZusatz,betrag:e.target.value})} className="mono" style={{...selStil,width:100}}/>
            <input placeholder="Bemerkung" value={neueZusatz.text} onChange={(e)=>setNeueZusatz({...neueZusatz,text:e.target.value})} style={{...selStil,flex:1,minWidth:180}}/>
            <Knopf variante="voll" onClick={zusatzHinzu}>Hinzufügen</Knopf>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Titel klein>Alle Lektionen</Titel>
            <select value={filterOrt} onChange={(e)=>setFilterOrt(e.target.value)} style={{...selStil,marginBottom:14}}>
              <option value="">Alle Standorte</option>{Object.entries(ORTE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,maxHeight:500,overflow:"auto"}}>
            <table>
              <thead><tr><th>Datum</th><th>Kurs</th><th>Ist-Lehrer</th><th>Status</th><th>Satz</th><th>Lohn</th><th></th></tr></thead>
              <tbody>{gefiltert.map((l)=>{ const k=K(l.kursId); return (
                <tr key={l.id}>
                  <td className="mono" style={{color:C.inkSoft,whiteSpace:"nowrap"}}>{datumLabel(l.datum)} {k.zeit}</td>
                  <td>{k.stil} <span style={{color:C.muted,fontSize:12}}>· {ORTE[k.ort]} · {k.dauer}′</span></td>
                  <td><select value={l.istLehrer||""} onChange={(e)=>setOvF(l.id,{istLehrer:e.target.value||null})} style={{...selStil,padding:"3px 5px",fontSize:12}}>
                    <option value="">— offen —</option>
                    {lehrer.map(p=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}</select>
                    {istVertretung(l) && <span style={{marginLeft:6}}><Tag text="Vertr." farbe={C.brass}/></span>}</td>
                  <td>{l.status==="ausgefallen"?<Tag text={l.bemerkung||"Fällt aus"} farbe={C.muted}/>
                    :unbest(l)?<Tag text="Unbestätigt" farbe={C.rose}/>
                    :l.status==="gehalten"?<Tag text="Gehalten" farbe={C.teal}/>:<Tag text="Geplant" farbe={C.muted}/>}</td>
                  <td className="mono" style={{color:C.inkSoft}}>{satz(l)}</td>
                  <td className="mono">{lohn(l)?chf(lohn(l)):"–"}</td>
                  <td>{l.status==="ausgefallen"
                    ? <Knopf klein onClick={()=>setOvF(l.id,{status:"geplant",bemerkung:""})}>Reaktivieren</Knopf>
                    : <Knopf klein variante="warn" onClick={()=>setOvF(l.id,{status:"ausgefallen",bemerkung:"Ausfall"})}>Fällt aus</Knopf>}</td>
                </tr>); })}
              </tbody>
            </table>
          </div>
        </>)}

        {/* -------- Kurse -------- */}
        {ansicht==="kurse" && darfAdmin && (<>
          <Titel>Kurse verwalten</Titel>
          <p style={{color:C.inkSoft,fontSize:13,marginTop:-6,marginBottom:14}}>
            «Gültig ab/bis» steuert, wann ein Kurs läuft. Ein Kurs, der endet, bekommt ein Bis-Datum – vergangene Lektionen und Abrechnungen bleiben unberührt.
            Ein Ansatz beim Kurs überschreibt den Standardansatz der Lehrperson.</p>
          <div style={{...karte,gap:6,flexWrap:"wrap",marginBottom:14}}>
            <select value={neuerKurs.tag} onChange={(e)=>setNeuerKurs({...neuerKurs,tag:e.target.value})} style={selStil}>
              {TAGE.slice(1).map((t,i)=><option key={t} value={i+1}>{t}</option>)}</select>
            <input value={neuerKurs.zeit} onChange={(e)=>setNeuerKurs({...neuerKurs,zeit:e.target.value})} style={{...selStil,width:70}} className="mono"/>
            <select value={neuerKurs.dauer} onChange={(e)=>setNeuerKurs({...neuerKurs,dauer:e.target.value})} style={selStil}>
              <option value={55}>55′</option><option value={85}>85′</option></select>
            <input placeholder="Kursname" value={neuerKurs.stil} onChange={(e)=>setNeuerKurs({...neuerKurs,stil:e.target.value})} style={{...selStil,width:170}}/>
            <select value={neuerKurs.ort} onChange={(e)=>setNeuerKurs({...neuerKurs,ort:e.target.value})} style={selStil}>
              {Object.entries(ORTE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
            <select value={neuerKurs.lehrerId} onChange={(e)=>setNeuerKurs({...neuerKurs,lehrerId:e.target.value})} style={selStil}>
              {lehrpersonen.filter(p=>p.aktiv).map(p=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}</select>
            <input type="number" placeholder="Ansatz" value={neuerKurs.ansatz} onChange={(e)=>setNeuerKurs({...neuerKurs,ansatz:e.target.value})} style={{...selStil,width:85}} className="mono"/>
            <input type="date" value={neuerKurs.von} onChange={(e)=>setNeuerKurs({...neuerKurs,von:e.target.value})} style={selStil}/>
            <Knopf variante="voll" onClick={kursHinzu}>Kurs hinzufügen</Knopf>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,maxHeight:560,overflow:"auto"}}>
            <table>
              <thead><tr><th>Tag</th><th>Zeit</th><th>Dauer</th><th>Kurs</th><th>Standort</th><th>Lehrer</th><th>Ansatz</th><th>Gültig ab</th><th>bis</th><th></th></tr></thead>
              <tbody>{kurse.map((k)=>(
                <tr key={k.id} style={{opacity: k.bis && k.bis < iso(HEUTE) ? 0.45 : 1}}>
                  <td style={{color:C.inkSoft}}>{TAGE[k.tag]}</td>
                  <td className="mono">{k.zeit}</td><td className="mono" style={{color:C.inkSoft}}>{k.dauer}′</td>
                  <td style={{fontWeight:600}}>{k.stil}</td><td style={{color:C.inkSoft}}>{ORTE[k.ort]}</td>
                  <td><select value={k.lehrerId} onChange={(e)=>kursAendern(k.id,{lehrerId:e.target.value})} style={{...selStil,padding:"3px 5px",fontSize:12}}>
                    {lehrpersonen.map(p=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}</select></td>
                  <td><input type="number" value={k.ansatz??""} placeholder={P(k.lehrerId).satz}
                    onChange={(e)=>kursAendern(k.id,{ansatz:e.target.value?Number(e.target.value):null})}
                    className="mono" style={{...selStil,width:66,padding:"3px 5px",fontSize:12}}/></td>
                  <td><input type="date" value={k.von} onChange={(e)=>kursAendern(k.id,{von:e.target.value})} style={{...selStil,padding:"3px 5px",fontSize:12}}/></td>
                  <td><input type="date" value={k.bis||""} onChange={(e)=>kursAendern(k.id,{bis:e.target.value})} style={{...selStil,padding:"3px 5px",fontSize:12}}/></td>
                  <td><Knopf klein variante="warn" onClick={()=>kursAendern(k.id,{bis:iso(HEUTE)})}>Beenden</Knopf></td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </>)}

        {/* -------- Anlässe -------- */}
        {ansicht==="anlaesse" && darfAnlaesse && (<>
          <Titel>Anlässe verwalten</Titel>
          <p style={{color:C.inkSoft,fontSize:13,marginTop:-6,marginBottom:14}}>
            Einmalige Termine. Ohne Lehrer angelegt = offen zum Eintragen. Bestätigte Anlässe fliessen automatisch in die Abrechnung.
            {!darfLohn && " Die Pauschalen werden vom Backoffice gesetzt und sind hier nicht sichtbar."}</p>
          <div style={{...karte,gap:6,flexWrap:"wrap",marginBottom:14}}>
            <input type="date" value={neuerAnlass.datum} onChange={(e)=>setNeuerAnlass({...neuerAnlass,datum:e.target.value})} style={selStil}/>
            <input value={neuerAnlass.zeit} onChange={(e)=>setNeuerAnlass({...neuerAnlass,zeit:e.target.value})} style={{...selStil,width:70}} className="mono"/>
            <input placeholder="Titel" value={neuerAnlass.titel} onChange={(e)=>setNeuerAnlass({...neuerAnlass,titel:e.target.value})} style={{...selStil,width:190}}/>
            <select value={neuerAnlass.typ} onChange={(e)=>setNeuerAnlass({...neuerAnlass,typ:e.target.value})} style={selStil}>
              {ANLASS_TYPEN.map(t=><option key={t}>{t}</option>)}</select>
            <select value={neuerAnlass.ort} onChange={(e)=>setNeuerAnlass({...neuerAnlass,ort:e.target.value})} style={selStil}>
              {Object.entries(ORTE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
            {darfLohn && <input type="number" placeholder="Pauschale" value={neuerAnlass.pauschale} onChange={(e)=>setNeuerAnlass({...neuerAnlass,pauschale:e.target.value})} className="mono" style={{...selStil,width:100}}/>}
            <select value={neuerAnlass.lehrerId} onChange={(e)=>setNeuerAnlass({...neuerAnlass,lehrerId:e.target.value})} style={selStil}>
              <option value="">offen lassen</option>
              {lehrpersonen.filter(p=>p.aktiv).map(p=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}</select>
            <Knopf variante="voll" onClick={anlassHinzu}>Anlass anlegen</Knopf>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,maxHeight:520,overflow:"auto"}}>
            <table>
              <thead><tr><th>Datum</th><th>Titel</th><th>Typ</th><th>Standort</th>{darfLohn && <th>Pauschale</th>}<th>Lehrer</th><th>Status</th><th></th></tr></thead>
              <tbody>{anlaesseMonat.length===0 && <tr><td colSpan={darfLohn?8:7} style={{color:C.muted}}>Keine Anlässe in diesem Monat.</td></tr>}
              {anlaesseMonat.map((a)=>(
                <tr key={a.id}>
                  <td className="mono" style={{color:C.inkSoft,whiteSpace:"nowrap"}}>{datumLabel(a.datum)} {a.zeit}</td>
                  <td style={{fontWeight:600}}>{a.titel}</td><td>{a.typ}</td><td style={{color:C.inkSoft}}>{ORTE[a.ort]}</td>
                  {darfLohn && <td><input type="number" value={a.pauschale} onChange={(e)=>anlassSetzen(a.id,{pauschale:Number(e.target.value)})} className="mono" style={{...selStil,width:80,padding:"3px 5px",fontSize:12}}/></td>}
                  <td><select value={a.lehrerId||""} onChange={(e)=>anlassSetzen(a.id,{lehrerId:e.target.value||null,status:e.target.value?(a.status==="offen"?"geplant":a.status):"offen"})} style={{...selStil,padding:"3px 5px",fontSize:12}}>
                    <option value="">— offen —</option>{lehrpersonen.map(p=><option key={p.id} value={p.id}>{p.vorname} {p.nachname}</option>)}</select></td>
                  <td>{a.status==="ausgefallen"?<Tag text="Fällt aus" farbe={C.muted}/>
                    :anlassUnbest(a)?<Tag text="Unbestätigt" farbe={C.rose}/>
                    :a.status==="gehalten"?<Tag text="Bestätigt" farbe={C.teal}/>
                    :a.status==="offen"?<Tag text="Offen" farbe={C.brass}/>:<Tag text="Geplant" farbe={C.muted}/>}</td>
                  <td>{a.status==="ausgefallen"
                    ? <Knopf klein onClick={()=>anlassSetzen(a.id,{status:a.lehrerId?"geplant":"offen"})}>Reaktivieren</Knopf>
                    : <Knopf klein variante="warn" onClick={()=>anlassSetzen(a.id,{status:"ausgefallen"})}>Fällt aus</Knopf>}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </>)}

        {/* -------- Personen -------- */}
        {ansicht==="personen" && darfAdmin && (<>
          <Titel>Personen &amp; Rollen</Titel>
          <p style={{color:C.inkSoft,fontSize:13,marginTop:-6,marginBottom:14}}>
            Ansatz und Vertretungssatz pro Lohnstunde (55′ = 1.0, 85′ = 1.5). Kursabweichungen unter «Kurse verwalten».
            Rollen bestimmen, was eine Person sieht. Wer «Lehrer» nicht hat, erscheint nicht in der Stundenzuteilung.</p>
          <div style={{...karte,gap:8,flexWrap:"wrap",marginBottom:14}}>
            <input placeholder="Vorname" value={neuerLehrer.vorname} onChange={(e)=>setNeuerLehrer({...neuerLehrer,vorname:e.target.value})} style={selStil}/>
            <input placeholder="Nachname" value={neuerLehrer.nachname} onChange={(e)=>setNeuerLehrer({...neuerLehrer,nachname:e.target.value})} style={selStil}/>
            <span title="Standardansatz" style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:12,color:C.inkSoft}}>Satz</span>
              <input type="number" value={neuerLehrer.satz} onChange={(e)=>setNeuerLehrer({...neuerLehrer,satz:e.target.value})} className="mono" style={{...selStil,width:70}}/></span>
            <span title="Vertretungssatz" style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:12,color:C.inkSoft}}>Vertr.</span>
              <input type="number" value={neuerLehrer.vertretungssatz} onChange={(e)=>setNeuerLehrer({...neuerLehrer,vertretungssatz:e.target.value})} className="mono" style={{...selStil,width:70}}/></span>
            <Knopf variante="voll" onClick={lehrerHinzu}>Person hinzufügen</Knopf>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,maxHeight:560,overflow:"auto"}}>
            <table>
              <thead><tr><th>Name</th><th>Ansatz</th><th>Vertr.</th><th>Lehrer</th><th>Anlässe</th><th>Lohn</th><th>Admin</th><th>Kurse</th><th>Status</th></tr></thead>
              <tbody>{lehrer.map((p)=>{ const eig = kurse.filter(k=>k.lehrerId===p.id && !k.bis);
                const toggle = (feld)=>setLehrer(l=>l.map(x=>x.id===p.id?{...x,[feld]:!x[feld]}:x));
                const RB = ({feld})=><input type="checkbox" checked={!!p[feld]} onChange={()=>toggle(feld)} style={{cursor:"pointer"}}/>;
                return (
                <tr key={p.id} style={{opacity:p.aktiv?1:0.45}}>
                  <td style={{fontWeight:600}}>{p.nachname}, {p.vorname}</td>
                  <td><input type="number" value={p.satz} onChange={(e)=>setLehrer(l=>l.map(x=>x.id===p.id?{...x,satz:Number(e.target.value)}:x))}
                    className="mono" style={{...selStil,width:64,padding:"3px 5px",fontSize:12}}/></td>
                  <td><input type="number" value={p.vertretungssatz} onChange={(e)=>setLehrer(l=>l.map(x=>x.id===p.id?{...x,vertretungssatz:Number(e.target.value)}:x))}
                    className="mono" style={{...selStil,width:64,padding:"3px 5px",fontSize:12}}/></td>
                  <td><RB feld="r_lehrer"/></td><td><RB feld="r_anlaesse"/></td><td><RB feld="r_lohn"/></td><td><RB feld="r_admin"/></td>
                  <td className="mono" style={{color:C.inkSoft}}>{eig.length}</td>
                  <td><Knopf klein variante={p.aktiv?"still":"voll"} onClick={()=>setLehrer(l=>l.map(x=>x.id===p.id?{...x,aktiv:!x.aktiv}:x))}>
                    {p.aktiv?"Aktiv":"Inaktiv"}</Knopf></td>
                </tr>); })}
              </tbody>
            </table>
          </div>
        </>)}
      </div>
    </div>
  );
}
