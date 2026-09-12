// Positions use local mapped footprints; coordinates mark approximate landmark centres.
export const LANDMARKS = [
  {
    "id": "lotus",
    "occlusionBox": [
      [
        -40,
        0,
        -40
      ],
      [
        40,
        356,
        40
      ]
    ],
    "anchor": [
      0,
      244,
      0
    ],
    "name": "Lotus Tower",
    "sinhala": "නෙළුම් කුලුන",
    "kind": "Colombo’s signature landmark",
    "point": [
      0,
      356,
      0
    ],
    "target": [
      0,
      225,
      0
    ],
    "lens": 46,
    "coordinates": [
      6.92703,
      79.85832
    ],
    "view": [
      -390,
      270,
      530
    ]
  },
  {
    "id": "altair",
    "occlusionBox": [
      [
        -510,
        0,
        810
      ],
      [
        -325,
        245,
        1010
      ]
    ],
    "name": "Altair",
    "sinhala": "අල්ටෙයාර්",
    "kind": "Twin towers by Beira Lake",
    "point": [
      -420,
      252,
      895
    ],
    "target": [
      -414,
      116,
      896
    ],
    "lens": 45,
    "coordinates": [
      6.91889,
      79.85444
    ],
    "view": [
      -180,
      210,
      1240
    ],
    "mobileView": [
      -133,
      229,
      1309
    ]
  },
  {
    "id": "gangaramaya",
    "name": "Gangaramaya Temple",
    "sinhala": "ගංගාරාම විහාරය",
    "kind": "A temple in the heart of the city",
    "point": [
      -195,
      35,
      1165
    ],
    "target": [
      -190,
      8,
      1175
    ],
    "lens": 48,
    "coordinates": [
      6.91639,
      79.85639
    ],
    "view": [
      -345,
      85,
      1305
    ],
    "mobileView": [
      -393.7,
      108.8,
      1346.2
    ]
  },
  {
    "id": "wtc",
    "occlusionBox": [
      [
        -1655,
        0,
        -680
      ],
      [
        -1545,
        154,
        -590
      ]
    ],
    "name": "World Trade Center",
    "sinhala": "ලෝක වෙළෙඳ මධ්‍යස්ථානය",
    "kind": "The twin towers of Colombo Fort",
    "point": [
      -1598,
      177,
      -637
    ],
    "target": [
      -1599,
      81,
      -633
    ],
    "lens": 45,
    "coordinates": [
      6.9325,
      79.84389
    ],
    "view": [
      -1770,
      175,
      -953
    ],
    "mobileView": [
      -1770,
      175,
      -953
    ]
  },
  {
    "id": "fort",
    "name": "Colombo Fort Station",
    "sinhala": "කොළඹ කොටුව දුම්රියපොළ",
    "kind": "The railway gateway to the city",
    "point": [
      -955,
      35,
      -723
    ],
    "target": [
      -951,
      6,
      -723
    ],
    "lens": 48,
    "coordinates": [
      6.93361,
      79.85083
    ],
    "view": [
      -1108,
      123,
      -998
    ],
    "mobileView": [
      -1260,
      250,
      -1278
    ]
  },
  {
    "id": "museum",
    "name": "National Museum",
    "sinhala": "ජාතික කෞතුකාගාරය",
    "kind": "Colombo’s cultural quarter",
    "point": [
      299,
      33,
      1797
    ],
    "target": [
      298,
      12,
      1804
    ],
    "lens": 48,
    "coordinates": [
      6.91,
      79.86083
    ],
    "view": [
      422,
      87,
      1624
    ],
    "mobileView": [
      433.3,
      94,
      1608.2
    ]
  }
];

export const ADDITIONAL_LANDMARKS = [
  {
    id: "galle_face_green",
    name: "Galle Face Green",
    sinhala: "ගාලු මුවදොර පිටිය",
    tamil: "காலி முகத்திடல்",
    kind: "Historic seaside promenade & kite lawn",
    point: [-1410, 15, 450],
    target: [-1410, 5, 450],
    lens: 42,
    coordinates: [6.9230, 79.8436],
    view: [-1100, 140, 450],
    mobileView: [-1020, 190, 450]
  },
  {
    id: "one_galle_face",
    name: "One Galle Face & Shangri-La",
    sinhala: "වන් ගෝල් ෆේස්",
    tamil: "ஒன் காலி முக வளாகம்",
    kind: "Twin glass towers on the oceanfront",
    point: [-1450, 194, 20],
    target: [-1450, 95, 20],
    lens: 40,
    coordinates: [6.92778, 79.84472],
    view: [-1050, 170, -250],
    mobileView: [-920, 210, -320]
  },
  {
    id: "galle-face-hotel",
    name: "Galle Face Hotel",
    sinhala: "ගාලු මුවදොර හෝටලය",
    tamil: "காலி முக ஹோட்டல்",
    kind: "Grand 1864 colonial heritage on the sea",
    point: [-1354, 24, 753],
    target: [-1354, 16, 753],
    lens: 45,
    coordinates: [6.91979, 79.84599],
    view: [-1520, 42, 753],
    mobileView: [-1560, 58, 753]
  },
  {
    id: "cinnamon_life",
    name: "Cinnamon Life · City of Dreams",
    sinhala: "සිනමන් ලයිෆ්",
    tamil: "சின்னமன் லைஃப்",
    kind: "Cecil Balmond’s waterfront icon",
    point: [-1115, 154, 220],
    target: [-1115, 75, 220],
    lens: 42,
    coordinates: [6.92514, 79.8477],
    view: [-780, 160, -40],
    mobileView: [-690, 195, -120]
  },
  {
    id: "port_city",
    name: "Colombo Port City & Marina",
    sinhala: "කොළඹ වරාය නගරය",
    tamil: "கொழும்பு துறைமுக நகரம்",
    kind: "Reclaimed coastal peninsula and marina",
    point: [-1950, 25, -350],
    target: [-1850, 10, -350],
    lens: 38,
    coordinates: [6.9360, 79.8390],
    view: [-1550, 180, -750],
    mobileView: [-1450, 240, -880]
  },
  {
    id: "jami-ul-alfar",
    name: "Red Mosque · Jami Ul-Alfar",
    sinhala: "ජාමි උල්-අල්ෆාර් පල්ලිය (රතු පල්ලිය)",
    tamil: "ஜாமி உல்-அல்ஃபார் பள்ளிவாசல்",
    kind: "Candy-striped Indo-Saracenic jewel of Pettah",
    point: [-715, 36, -1265],
    target: [-715, 20, -1265],
    lens: 45,
    coordinates: [6.9385, 79.8518],
    view: [-780, 52, -1160],
    mobileView: [-800, 72, -1140]
  },
  {
    id: "old-parliament",
    name: "Old Parliament Building",
    sinhala: "පැරණි පාර්ලිමේන්තු ගොඩනැගිල්ල",
    tamil: "பழைய நாடாளுமன்ற கட்டிடம்",
    kind: "1930 Neo-Baroque sandstone palace on Galle Face",
    point: [-1580, 30, -180],
    target: [-1580, 20, -180],
    lens: 46,
    coordinates: [6.93111, 79.84306],
    view: [-1560, 65, -50],
    mobileView: [-1560, 85, -40]
  },
  {
    id: "independence-hall",
    name: "Independence Memorial Hall",
    sinhala: "නිදහස් අනුස්මරණ ශාලාව",
    tamil: "சுதந்திர நினைவு மண்டபம்",
    kind: "National monument with 60 carved stone columns",
    point: [240, 22, 2580],
    target: [240, 14, 2580],
    lens: 48,
    coordinates: [6.9042, 79.8679],
    view: [240, 55, 2390],
    mobileView: [240, 75, 2360]
  },
  {
    id: "town-hall",
    name: "Colombo Town Hall",
    sinhala: "කොළඹ නගර ශාලාව",
    tamil: "கொழும்பு நகர மண்டபம்",
    kind: "White domed civic palace at Viharamahadevi Park",
    point: [120, 42, 1220],
    target: [120, 20, 1220],
    lens: 46,
    coordinates: [6.91585, 79.86379],
    view: [200, 58, 1420],
    mobileView: [220, 80, 1450]
  },
  {
    id: "clock-tower",
    name: "Fort Clock Tower & Lighthouse",
    sinhala: "කොටුව ඔරලෝසු කණුව සහ ප්‍රදීපාගාරය",
    tamil: "கோட்டை மணிக்கூண்டு",
    kind: "1857 Victorian masonry tower on Chatham Street",
    point: [-1480, 36, -880],
    target: [-1480, 18, -880],
    lens: 46,
    coordinates: [6.93472, 79.84278],
    view: [-1410, 55, -800],
    mobileView: [-1380, 75, -770]
  },
  {
    id: "sambodhi-chaithya",
    name: "Sambodhi Chaithya · Maritime Stupa",
    sinhala: "සම්බෝධි චෛත්‍යය",
    tamil: "சம்போதி சைத்தியம்",
    kind: "47m maritime stupa spanning Marine Drive",
    point: [-1720, 24, -1180],
    target: [-1720, 16, -1180],
    lens: 42,
    coordinates: [6.93833, 79.84194],
    view: [-1660, 50, -1130],
    mobileView: [-1640, 70, -1110]
  },
  {
    id: "nelum-pokuna",
    name: "Nelum Pokuna Theatre",
    sinhala: "නෙළුම් පොකුණ මහින්ද රාජපක්ෂ රඟහල",
    tamil: "நெலும் பொகுண மஹிந்த ராஜபக்ஷ திரையரங்கு",
    kind: "8-petaled stylized lotus pond auditorium",
    point: [554, 18, 1803],
    target: [554, 10, 1803],
    lens: 45,
    coordinates: [6.91083, 79.86333],
    view: [624, 52, 1703],
    mobileView: [644, 72, 1683]
  },
  {
    id: "harbour-cranes",
    name: "Colombo Harbour & Port Terminals",
    sinhala: "කොළඹ වරාය සහ බහාලුම් පර්යන්ත",
    tamil: "கொழும்பு துறைமுகம் மற்றும் கொள்கலன் முனையங்கள்",
    kind: "Deepwater container quay & towering STS cranes",
    point: [-1450, 36, -1850],
    target: [-1450, 18, -1850],
    lens: 38,
    coordinates: [6.9480, 79.8450],
    view: [-1340, 110, -1770],
    mobileView: [-1300, 140, -1740]
  }
];

export const ALL_LANDMARKS = [...LANDMARKS, ...ADDITIONAL_LANDMARKS];

