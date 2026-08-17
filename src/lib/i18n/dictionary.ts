export type Locale = "en" | "nl";

export interface Dictionary {
  nav: {
    howWeWork: string;
    services: string;
    approach: string;
    faq: string;
    getInTouch: string;
  };
  hero: {
    eyebrow: string;
    headlinePrefix: string;
    headlineHighlight: string;
    subtext: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  highlights: {
    emoji: string;
    title: string;
    description: string;
  }[];
  process: {
    eyebrow: string;
    heading: string;
    steps: { title: string; description: string }[];
  };
  services: {
    eyebrow: string;
    heading: string;
    items: { title: string; description: string }[];
  };
  approach: {
    headingPrefix: string;
    headingHighlight: string;
    headingSuffix: string;
    points: { title: string; description: string }[];
  };
  toolsStrip: {
    heading: string;
    description: string;
  };
  pricing: {
    badge: string;
    heading: string;
    description: string;
    cta: string;
  };
  faq: {
    eyebrow: string;
    heading: string;
    items: { question: string; answer: string }[];
  };
  contact: {
    eyebrow: string;
    heading: string;
    description: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    recaptchaError: string;
    genericError: string;
  };
  footer: {
    description: string;
    location: string;
    copyright: string;
    backToTop: string;
  };
}

export const dictionary: Record<Locale, Dictionary> = {
  en: {
    nav: {
      howWeWork: "How we work",
      services: "Services",
      approach: "Approach",
      faq: "FAQ",
      getInTouch: "Get in touch",
    },
    hero: {
      eyebrow: "AI automation for SMEs",
      headlinePrefix: "AI automation that fits your business,",
      headlineHighlight: "not a generic chatbot",
      subtext:
        "Arisoft builds custom AI-powered automation for SMEs, connecting the tools you already use so repetitive manual work such as support, data entry, follow-ups, and reporting happens without anyone touching it.",
      ctaPrimary: "Get in touch",
      ctaSecondary: "See how we work",
    },
    highlights: [
      {
        emoji: "📞",
        title: "Free discovery call",
        description: "No obligation, just a conversation about where automation could help.",
      },
      {
        emoji: "🛠️",
        title: "Built around your workflow",
        description: "No generic chatbot, automation shaped around how your team actually works.",
      },
      {
        emoji: "🔒",
        title: "Private, on-premise option",
        description: "For businesses where data privacy is non-negotiable.",
      },
    ],
    process: {
      eyebrow: "How we work",
      heading: "A practical process, from first call to handover",
      steps: [
        {
          title: "Free discovery call",
          description:
            "We offer a free meeting to understand your workflow, spot the bottlenecks, and identify what's worth automating.",
        },
        {
          title: "We learn how your business operates",
          description:
            "We start with the people, tools, and routines behind the work, not a generic demo.",
        },
        {
          title: "We identify what's worth automating",
          description:
            "Together, we focus on repetitive work where automation will make a real difference.",
        },
        {
          title: "We build, connect, and hand it over",
          description:
            "We connect it to your tools and leave your team with something they can actually maintain.",
        },
      ],
    },
    services: {
      eyebrow: "Services",
      heading: "Automation across the work that eats your team's time",
      items: [
        {
          title: "Customer support automation",
          description:
            "Handle common questions, triage tickets, and route the rest to your team automatically.",
        },
        {
          title: "Internal workflows",
          description:
            "Automate the repetitive steps between the tools your team already uses every day.",
        },
        {
          title: "Lead intake",
          description:
            "Capture, qualify, and follow up with new leads the moment they come in, day or night.",
        },
        {
          title: "Company knowledge",
          description:
            "Turn scattered docs and know-how into answers your team can actually find and trust.",
        },
      ],
    },
    approach: {
      headingPrefix: "Built around",
      headingHighlight: "trust",
      headingSuffix: ", not just automation",
      points: [
        {
          title: "Safe AI access to your internal systems",
          description: "Every integration is scoped to exactly what it needs, and nothing more.",
        },
        {
          title: "Private, on-premise AI for data-sensitive work",
          description:
            "For businesses where data privacy is non-negotiable, we can host entirely on your own infrastructure.",
        },
        {
          title: "Connect the tools you already rely on",
          description:
            "No rip-and-replace. We plug into Excel, Outlook, Gmail, Google Sheets, WhatsApp, and whatever else runs your business.",
        },
      ],
    },
    toolsStrip: {
      heading: "Connect the tools you already rely on",
      description: "No rip-and-replace. We plug automation into the systems your team already trusts.",
    },
    pricing: {
      badge: "Pricing",
      heading: "There are no fixed tiers here.",
      description:
        "Tell us what is taking up time in your business, and we'll put together a practical, tailored quote for the work that is worth automating.",
      cta: "Get a tailored quote",
    },
    faq: {
      eyebrow: "Support",
      heading: "Frequently asked questions",
      items: [
        {
          question: "Do we need technical knowledge to work with you?",
          answer:
            "No. We start with the work your team already does and explain every decision in plain language.",
        },
        {
          question: "Is our data safe?",
          answer:
            "We design each solution around the level of access and privacy your business needs. That can include restricted permissions, private connections, and on-premise options.",
        },
        {
          question: "How long does a typical project take?",
          answer:
            "It depends on the workflow, but we keep projects focused. After understanding the work, we agree a realistic scope and build in practical stages.",
        },
        {
          question: "Do you only build chatbots?",
          answer:
            "No. Chat is only one interface. We also automate the behind-the-scenes work around support, lead handling, internal knowledge, follow-ups, and reporting.",
        },
        {
          question: "Can this run entirely on our own servers?",
          answer:
            "Yes. For businesses where data privacy is non-negotiable, we can design a private, on-premise setup so sensitive information stays on your infrastructure.",
        },
      ],
    },
    contact: {
      eyebrow: "Get in touch",
      heading: "Send us a message",
      description: "Tell us what's taking up time in your business, we'll get back to you shortly.",
      nameLabel: "Name",
      namePlaceholder: "Your name",
      emailLabel: "Email",
      emailPlaceholder: "you@company.com",
      messageLabel: "Message",
      messagePlaceholder: "What's taking up time in your business?",
      submit: "Send message",
      submitting: "Sending…",
      success: "Thanks, we'll be in touch soon.",
      recaptchaError: "Please confirm you're not a robot before sending.",
      genericError: "Something went wrong.",
    },
    footer: {
      description:
        "Tailored AI automation for SMEs, connecting the tools you already use so repetitive work happens without anyone touching it.",
      location: "Delft, Netherlands",
      copyright: "Arisoft. All rights reserved.",
      backToTop: "Back to top",
    },
  },
  nl: {
    nav: {
      howWeWork: "Hoe we werken",
      services: "Diensten",
      approach: "Aanpak",
      faq: "FAQ",
      getInTouch: "Neem contact op",
    },
    hero: {
      eyebrow: "AI-automatisering voor het Nederlandse MKB",
      headlinePrefix: "AI-automatisering die past bij jouw bedrijf,",
      headlineHighlight: "geen standaard chatbot",
      subtext:
        "Arisoft bouwt AI-automatisering op maat voor het MKB en koppelt de tools die je al gebruikt, zodat terugkerend werk zoals support, data-invoer, follow-ups en rapportages vanzelf gebeurt.",
      ctaPrimary: "Neem contact op",
      ctaSecondary: "Bekijk hoe we werken",
    },
    highlights: [
      {
        emoji: "📞",
        title: "Gratis kennismakingsgesprek",
        description: "Vrijblijvend, gewoon een gesprek over waar automatisering kan helpen.",
      },
      {
        emoji: "🛠️",
        title: "Afgestemd op jouw workflow",
        description: "Geen standaard chatbot, maar automatisering die aansluit op hoe jouw team écht werkt.",
      },
      {
        emoji: "🔒",
        title: "Privé, on-premise optie",
        description: "Voor bedrijven waar dataprivacy geen discussiepunt is.",
      },
    ],
    process: {
      eyebrow: "Hoe we werken",
      heading: "Een praktisch proces, van eerste gesprek tot oplevering",
      steps: [
        {
          title: "Gratis kennismakingsgesprek",
          description:
            "We plannen een gratis gesprek om je workflow te begrijpen, de knelpunten te vinden en te bepalen wat de moeite waard is om te automatiseren.",
        },
        {
          title: "We leren hoe jouw bedrijf werkt",
          description:
            "We beginnen bij de mensen, tools en routines achter het werk, niet bij een standaard demo.",
        },
        {
          title: "We bepalen wat de moeite waard is",
          description:
            "Samen focussen we op terugkerend werk waar automatisering écht verschil maakt.",
        },
        {
          title: "We bouwen, koppelen en dragen over",
          description:
            "We koppelen alles aan jouw tools en zorgen dat jouw team er zelf mee verder kan.",
        },
      ],
    },
    services: {
      eyebrow: "Diensten",
      heading: "Automatisering voor het werk dat de meeste tijd kost",
      items: [
        {
          title: "Klantenservice-automatisering",
          description:
            "Beantwoord veelgestelde vragen, sorteer tickets en stuur de rest automatisch door naar je team.",
        },
        {
          title: "Interne workflows",
          description:
            "Automatiseer de terugkerende stappen tussen de tools die je team al dagelijks gebruikt.",
        },
        {
          title: "Lead-intake",
          description:
            "Leg nieuwe leads vast, kwalificeer ze en volg ze direct op, dag en nacht.",
        },
        {
          title: "Bedrijfskennis",
          description:
            "Maak van verspreide documenten en kennis antwoorden die je team makkelijk terugvindt en kan vertrouwen.",
        },
      ],
    },
    approach: {
      headingPrefix: "Gebouwd op",
      headingHighlight: "vertrouwen",
      headingSuffix: ", niet alleen automatisering",
      points: [
        {
          title: "Veilige AI-toegang tot je interne systemen",
          description: "Elke integratie krijgt precies de toegang die nodig is, niet meer en niet minder.",
        },
        {
          title: "Private, on-premise AI voor privacygevoelig werk",
          description:
            "Voor bedrijven waar dataprivacy geen discussiepunt is, hosten we alles volledig op jouw eigen infrastructuur.",
        },
        {
          title: "Koppel de tools die je al gebruikt",
          description:
            "Geen rigoureuze vervanging. We sluiten aan op Excel, Outlook, Gmail, Google Sheets, WhatsApp en wat je bedrijf verder draaiende houdt.",
        },
      ],
    },
    toolsStrip: {
      heading: "Koppel de tools die je al gebruikt",
      description: "Geen rigoureuze vervanging. We bouwen automatisering in de systemen die je team al vertrouwt.",
    },
    pricing: {
      badge: "Prijzen",
      heading: "Hier bestaan geen vaste pakketten.",
      description:
        "Vertel ons wat tijd kost in jouw bedrijf, en we stellen een praktische offerte op maat op voor het werk dat de moeite waard is om te automatiseren.",
      cta: "Vraag een offerte op maat aan",
    },
    faq: {
      eyebrow: "Ondersteuning",
      heading: "Veelgestelde vragen",
      items: [
        {
          question: "Hebben we technische kennis nodig om met jullie te werken?",
          answer:
            "Nee. We beginnen bij het werk dat jouw team al doet en leggen elke keuze in gewone taal uit.",
        },
        {
          question: "Is onze data veilig?",
          answer:
            "We stemmen elke oplossing af op het toegangs- en privacyniveau dat jouw bedrijf nodig heeft. Denk aan beperkte rechten, private verbindingen en on-premise opties.",
        },
        {
          question: "Hoe lang duurt een gemiddeld project?",
          answer:
            "Dat hangt af van de workflow, maar we houden projecten overzichtelijk. Na het in kaart brengen van het werk spreken we een realistische scope af en bouwen we in praktische fases.",
        },
        {
          question: "Bouwen jullie alleen chatbots?",
          answer:
            "Nee. Chat is maar één interface. We automatiseren ook het werk achter de schermen: support, leadopvolging, interne kennis, follow-ups en rapportages.",
        },
        {
          question: "Kan dit volledig op onze eigen servers draaien?",
          answer:
            "Ja. Voor bedrijven waar dataprivacy geen discussiepunt is, ontwerpen we een private, on-premise opzet zodat gevoelige informatie op jouw eigen infrastructuur blijft.",
        },
      ],
    },
    contact: {
      eyebrow: "Neem contact op",
      heading: "Stuur ons een bericht",
      description: "Vertel ons wat tijd kost in jouw bedrijf, we nemen snel contact met je op.",
      nameLabel: "Naam",
      namePlaceholder: "Je naam",
      emailLabel: "E-mail",
      emailPlaceholder: "jij@bedrijf.nl",
      messageLabel: "Bericht",
      messagePlaceholder: "Wat kost tijd in jouw bedrijf?",
      submit: "Verstuur bericht",
      submitting: "Versturen…",
      success: "Bedankt, we nemen snel contact met je op.",
      recaptchaError: "Bevestig dat je geen robot bent voordat je verstuurt.",
      genericError: "Er is iets misgegaan.",
    },
    footer: {
      description:
        "AI-automatisering op maat voor het MKB, we koppelen de tools die je al gebruikt zodat terugkerend werk vanzelf gebeurt.",
      location: "Delft, Nederland",
      copyright: "Arisoft. Alle rechten voorbehouden.",
      backToTop: "Terug naar boven",
    },
  },
};
