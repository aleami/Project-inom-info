export const places = [
  {
    id: "7eleven",
    name: "7 Eleven",
    type: "restaurant",
    lat: 59.346404452787205,
    lng: 18.071679216115548,
    openingHours: "Öppet idag",
    rooms: []
  },
  {
    id: "kiosk",
    name: "Kiosk",
    type: "restaurant",
    lat: 59.34620529611837,
    lng: 18.071627806665937,
    openingHours: "Öppet idag",
    rooms: []
  },
  {
    id: "murad-kiosken",
    name: "Murad Kiosken",
    type: "restaurant",
    lat: 59.34611629720569,
    lng: 18.07155698772373,
    openingHours: "Öppet idag",
    rooms: []
  },
  {
    id: "tekniska-tunnelbana",
    name: "Tekniska högskolan tunnelbana",
    type: "restaurant",
    lat: 59.345890401292955,
    lng: 18.07156794274578,
    openingHours: "Öppet idag",
    rooms: []
  },
  {
    id: "la-campus",
    name: "La Campus",
    type: "restaurant",
    lat: 59.346768293136165,
    lng: 18.071693709913998,
    openingHours: "Öppet idag",
    rooms: []
  },
  {
    id: "syster-o-bror",
    name: "Syster O Bror",
    type: "restaurant",
    lat: 59.34825208198007,
    lng: 18.070914739366792,
    openingHours: "Öppet idag",
    rooms: []
  },
  {
    id: "brazilia",
    name: "Brazilia",
    type: "restaurant",
    lat: 59.3533,
    lng: 18.0653,
    openingHours: "Mån–Fre 10:30–14:00",
    rooms: []
  },
  {
    id: "nymble",
    name: "Nymble",
    type: "restaurant",
    lat: 59.34711033005638,
    lng: 18.071263528835843,
    openingHours: "Mån–Fre 11:30–14:00",
    rooms: []
  },
  {
    id: "e-house",
    name: "E-huset",
    type: "building",
    lat: 59.346999,
    lng: 18.072972,
    openingHours: "06.00–24.00",
    microwaves: {
      count: 3,
      location: "Plan 3",
    },
    rooms: [
      { id: "E33", name: "E33", type: "exercise-room", seats: 36, available: true },
      { id: "E34", name: "E34", type: "exercise-room", seats: 28, available: false, notes: "tyst sal" },
      { id: "E35", name: "E35", type: "exercise-room", seats: 44, available: true },
      { id: "E36", name: "E36", type: "exercise-room", seats: 36, available: true },
      { id: "1319", name: "1319", type: "group-room", seats: 4, available: true },
      { id: "1320", name: "1320", type: "group-room", seats: 4, available: false },
      { id: "1321", name: "1321", type: "group-room", seats: 4, available: true },
      { id: "1456", name: "1456", type: "group-room", seats: 4, available: true }
    ]
  },
  {
    id: "d-house",
    name: "D-huset",
    type: "building",
    lat: 59.346806,
    lng: 18.073861,
    openingHours: "06.00–24.00",
    rooms: [
      {
        id: "d-open-3",
        name: "Plan 3 – Ljusgården",
        type: "open-study-space",
        seats: 110,
        available: true,
        notes: "vid Ljusgården, i 4345 och utanför D2 och D3"
      },
      {
        id: "d-open-4",
        name: "Plan 4 – VIC-studion",
        type: "open-study-space",
        seats: 16,
        available: true,
        notes: "i korridoren utanför VIC-studion"
      },
      {
        id: "d-open-5",
        name: "Plan 5 – Datorsalar",
        type: "open-study-space",
        seats: 14,
        available: false,
        notes: "i korridorer utanför datorsalarna"
      },
      {
        id: "4323",
        name: "4323",
        type: "group-room",
        seats: 4,
        available: true
      },
      {
        id: "4324",
        name: "4324",
        type: "group-room",
        seats: 6,
        available: false
      },
      {
        id: "4325",
        name: "4325",
        type: "group-room",
        seats: 8,
        available: true
      }
    ]
  },
  {
    id: "b-house",
    name: "B-huset",
    type: "building",
    lat: 59.351594630713784,
    lng: 18.06873358464996,
    openingHours: "06.00–24.00",
    rooms: [
      {
        id: "b-open-2-3",
        name: "Plan 2 och 3",
        type: "open-study-space",
        seats: 20,
        available: true,
        notes: "korridorsmiljö"
      }
    ]
  },
  {
    id: "k-house",
    name: "K-huset",
    type: "building",
    lat: 59.350113,
    lng: 18.074721,
    openingHours: "06.00–24.00",
    rooms: [
      {
        id: "k-open-56-3",
        name: "Teknikringen 56, plan 3 – utanför K1",
        type: "open-study-space",
        seats: 12,
        available: true
      },
      {
        id: "X",
        name: "X",
        type: "group-room",
        seats: 16,
        available: true,
        notes: "Teknikringen 56, plan 5"
      },
      {
        id: "304B",
        name: "304B",
        type: "group-room",
        seats: 4,
        available: true,
        notes: "Teknikringen 52, plan 3"
      },
      {
        id: "308B",
        name: "308B",
        type: "group-room",
        seats: 4,
        available: true,
        notes: "Teknikringen 52, plan 3"
      },
      {
        id: "310",
        name: "310",
        type: "group-room",
        seats: 6,
        available: true,
        notes: "Teknikringen 52, plan 3"
      },
      {
        id: "314",
        name: "314",
        type: "group-room",
        seats: 8,
        available: false,
        notes: "Teknikringen 52, plan 3"
      },
      {
        id: "316",
        name: "316",
        type: "group-room",
        seats: 8,
        available: true,
        notes: "Teknikringen 52, plan 3"
      }
    ]
  },
  {
    id: "library",
    name: "KTH Biblioteket",
    type: "building",
    lat: 59.347988598069044,
    lng: 18.072825257660973,
    openingHours: "Se bibliotekets öppettider",
    rooms: [
      {
        id: "lib-study-1-4",
        name: "Plan 1–4",
        type: "open-study-space",
        seats: 337,
        available: true,
        notes: "cirka 100 tysta läsplatser"
      },
      {
        id: "lib-dropin",
        name: "Nedslagsplatser",
        type: "open-study-space",
        seats: 479,
        available: true,
        notes: "enklare stolar, fåtöljer och bänkar"
      },
      {
        id: "lib-group-entrance",
        name: "Entréplan grupprum",
        type: "group-room",
        seats: 20,
        available: true,
        notes: "20 rum totalt"
      },
      {
        id: "lib-group-3",
        name: "Plan 3 grupprum",
        type: "group-room",
        seats: 4,
        available: true,
        notes: "4 rum, 3 obokningsbara"
      }
    ]
  },
  {
    id: "innovation",
    name: "KTH Innovation",
    type: "building",
    lat: 59.34955920649063,
    lng: 18.071678399989757,
    openingHours: "07.30–16.30",
    microwaves: {
      count: 1,
      location: "KTH Innovation",
      notes: "kommers",
    },
    rooms: [
      {
        id: "innovation-entry",
        name: "Entréplan – Arenan",
        type: "open-study-space",
        seats: 48,
        available: true
      }
    ]
  },
  {
    id: "m-house",
    name: "M-huset",
    type: "building",
    lat: 59.35347326923611,
    lng: 18.065258459697176,
    openingHours: "06.00–24.00",
    microwaves: {
      count: 30,
      location: "Plan 1",
      notes: "preliminärt",
    },
    rooms: [
      {
        id: "m-open-2",
        name: "Plan 2",
        type: "open-study-space",
        seats: 88,
        available: true
      },
      {
        id: "m-open-3",
        name: "Plan 3",
        type: "open-study-space",
        seats: 8,
        available: true
      },
      {
        id: "C313",
        name: "C313",
        type: "group-room",
        seats: 6,
        available: true
      },
      {
        id: "C314",
        name: "C314",
        type: "group-room",
        seats: 6,
        available: true
      },
      {
        id: "C315",
        name: "C315",
        type: "group-room",
        seats: 6,
        available: false
      },
      {
        id: "C316",
        name: "C316",
        type: "group-room",
        seats: 6,
        available: true
      },
      {
        id: "C317",
        name: "C317",
        type: "group-room",
        seats: 6,
        available: true
      },
      {
        id: "C318",
        name: "C318",
        type: "group-room",
        seats: 6,
        available: true
      },
      {
        id: "C319",
        name: "C319",
        type: "group-room",
        seats: 8,
        available: true
      },
      {
        id: "C320",
        name: "C320",
        type: "group-room",
        seats: 8,
        available: false
      },
      {
        id: "C321",
        name: "C321",
        type: "group-room",
        seats: 10,
        available: true,
        notes: "8–12 platser"
      }
    ]
  },
  {
    id: "ths-nymble-study",
    name: "Nymble studieytor",
    type: "building",
    lat: 59.347303939823625,
    lng: 18.07069654232144,
    openingHours: "Se THS öppettider",
    microwaves: {
      count: 30,
      location: "Plan 1 & 2",
      notes: "preliminärt",
    },
    rooms: [
      {
        id: "nymble-open-1-2",
        name: "Plan 1 och 2",
        type: "open-study-space",
        seats: 404,
        available: true
      }
    ]
  },
  {
    id: "q-house",
    name: "Q-huset",
    type: "building",
    lat: 59.35007418321177,
    lng: 18.06694262697614,
    openingHours: "06.00–24.00",
    microwaves: {
      count: 10,
      location: "Plan 2",
    },
    rooms: [
      {
        id: "B228",
        name: "B:228",
        type: "open-study-space",
        seats: 22,
        available: true,
        notes: "plan 2"
      },
      {
        id: "A229",
        name: "A:229",
        type: "open-study-space",
        seats: 10,
        available: true,
        notes: "plan 2"
      },
      {
        id: "B242",
        name: "B:242",
        type: "open-study-space",
        seats: 6,
        available: true,
        notes: "plan 2, tyst läsesal"
      },
      {
        id: "q-open-3",
        name: "Plan 3 – öppna studieplatser",
        type: "open-study-space",
        seats: 37,
        available: true,
        notes: "bland annat i B:328, B:342 och A:346"
      },
      {
        id: "B116",
        name: "B:116",
        type: "group-room",
        seats: 10,
        available: true,
        notes: "plan 1"
      },
      {
        id: "A343",
        name: "A:343",
        type: "group-room",
        seats: 12,
        available: true,
        notes: "plan 3"
      },
      {
        id: "A347",
        name: "A:347",
        type: "group-room",
        seats: 12,
        available: false,
        notes: "plan 3"
      }
    ]
  },
  {
    id: "tek14",
    name: "Teknikringen 14",
    type: "building",
    lat: 59.34858878894365,
    lng: 18.073075101841273,
    openingHours: "Öppet dygnet runt",
    rooms: [
      {
        id: "fylkesalarna",
        name: "Plan 3 – Fylkesalarna",
        type: "open-study-space",
        seats: 60,
        available: true,
        notes: "Fylke, Bilbo, Frodo, Pippin, Merry, Sam"
      }
    ]
  },
  {
    id: "u-house",
    name: "U-huset",
    type: "building",
    lat: 59.35108449924672,
    lng: 18.070020420412632,
    openingHours: "06.00–24.00",
    microwaves: {
      count: 20,
      location: "Plan 2",
    },
    rooms: [
      {
        id: "U21",
        name: "U21 Break-out",
        type: "open-study-space",
        seats: 24,
        available: true,
        notes: "plan 2"
      },
      {
        id: "U31",
        name: "U31 Break-out",
        type: "open-study-space",
        seats: 16,
        available: true,
        notes: "plan 3"
      },
      {
        id: "U41",
        name: "U41 Break-out",
        type: "open-study-space",
        seats: 12,
        available: true,
        notes: "plan 4"
      },
      {
        id: "430",
        name: "430",
        type: "open-study-space",
        seats: 18,
        available: false,
        notes: "plan 4"
      },
      {
        id: "U51",
        name: "U51 Break-out",
        type: "open-study-space",
        seats: 36,
        available: true,
        notes: "plan 5"
      },
      {
        id: "541",
        name: "541",
        type: "open-study-space",
        seats: 12,
        available: true,
        notes: "plan 5"
      },
      {
        id: "U61",
        name: "U61 Break-out",
        type: "open-study-space",
        seats: 24,
        available: true,
        notes: "plan 6, U1"
      },
      {
        id: "750",
        name: "750",
        type: "open-study-space",
        seats: 12,
        available: false,
        notes: "plan 7"
      }
    ]
  },
  {
    id: "v-house",
    name: "V-huset",
    type: "building",
    lat: 59.35114079528462,
    lng: 18.071565199962066,
    openingHours: "Öppet dygnet runt",
    microwaves: {
      count: 20,
      location: "Plan 1",
    },
    rooms: [
      {
        id: "v-open-3",
        name: "Plan 3",
        type: "open-study-space",
        seats: 74,
        available: true,
        notes: "inklusive Karins fik"
      },
      {
        id: "v-open-4",
        name: "Plan 4",
        type: "open-study-space",
        seats: 4,
        available: true
      },
      {
        id: "v-open-5",
        name: "Plan 5",
        type: "open-study-space",
        seats: 9,
        available: true
      }
    ]
  },
  {
    id: "w-house",
    name: "W-huset",
    type: "building",
    lat: 59.35067274925012,
    lng: 18.070655892537182,
    openingHours: "06.00–24.00",
    microwaves: {
      count: 20,
      location: "Plan 1",
    },
    rooms: [
      {
        id: "250",
        name: "250",
        type: "open-study-space",
        seats: 16,
        available: true,
        notes: "plan 2"
      },
      {
        id: "w-open-3",
        name: "Plan 3 – ljusgården",
        type: "open-study-space",
        seats: 26,
        available: true
      },
      {
        id: "w-open-4",
        name: "Plan 4",
        type: "open-study-space",
        seats: 13,
        available: true,
        notes: "bland annat i 432 och W441"
      }
    ]
  }
];
