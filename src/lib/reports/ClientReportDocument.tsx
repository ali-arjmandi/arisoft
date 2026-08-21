import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { SELLER } from "@/lib/invoice/seller";
import type { ClientReportData } from "./clientReportData";

const COLORS = {
  primary: "#0140bf",
  primarySoft: "#eef2fd",
  foreground: "#262626",
  body: "#374151",
  muted: "#666666",
  border: "#dddddd",
  surfaceMuted: "#fafafa",
};

// The source logo is 859x759 — keep that aspect ratio at whatever width it's
// rendered so it never looks stretched.
const LOGO_WIDTH = 120;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 759) / 859);

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    color: COLORS.foreground,
  },
  pagePoppins: {
    fontFamily: "Poppins",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  headerMeta: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  companyNameBlock: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 16,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.foreground,
    marginBottom: 4,
  },
  companyMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  companyMetaItem: {
    fontSize: 9,
    color: COLORS.muted,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.foreground,
    marginBottom: 8,
  },
  section: {
    marginBottom: 22,
  },
  paragraph: {
    fontSize: 10,
    color: COLORS.body,
    lineHeight: 1.5,
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  bulletMark: {
    width: 12,
    fontSize: 10,
    color: COLORS.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    color: COLORS.body,
    lineHeight: 1.4,
  },
  opportunityCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 12,
    marginTop: 10,
  },
  opportunityCardBest: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  opportunityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  opportunityTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.foreground,
    marginRight: 8,
  },
  badge: {
    fontSize: 7.5,
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  serviceTag: {
    fontSize: 8,
    color: COLORS.primary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  opportunityExplanation: {
    fontSize: 9.5,
    color: COLORS.body,
    lineHeight: 1.4,
  },
  ctaBlock: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  ctaHeading: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.foreground,
    marginBottom: 4,
  },
  ctaLine: {
    fontSize: 9.5,
    color: COLORS.body,
  },
  pageFooter: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "center",
  },
});

interface ClientReportDocumentProps {
  data: ClientReportData;
  useFallbackFont?: boolean;
}

export function ClientReportDocument({ data, useFallbackFont }: ClientReportDocumentProps) {
  const hasFindings = data.servicesListed.length > 0 || data.manualProcessSignals.length > 0;

  return (
    <Document title={`Arisoft automation report — ${data.companyName}`}>
      <Page size="A4" style={[styles.page, useFallbackFont ? undefined : styles.pagePoppins]}>
        <View style={styles.headerRow}>
          {/* This is react-pdf's <Image>, not an HTML <img> — it has no alt prop. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/images/logo/full-lockup-transparent-blue.png" style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>AUTOMATION OPPORTUNITY REPORT</Text>
            <Text style={styles.headerMeta}>Prepared by {SELLER.legalName}</Text>
          </View>
        </View>

        <View style={styles.companyNameBlock}>
          <Text style={styles.companyName}>{data.companyName}</Text>
          <View style={styles.companyMetaRow}>
            {data.websiteUrl && <Text style={styles.companyMetaItem}>{data.websiteUrl}</Text>}
            {data.industrySubsegment && <Text style={styles.companyMetaItem}>{data.industrySubsegment}</Text>}
            {data.kvkNumber && <Text style={styles.companyMetaItem}>KvK {data.kvkNumber}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Overview</Text>
          <Text style={styles.paragraph}>{data.companySummary}</Text>
        </View>

        {hasFindings && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>What we noticed</Text>
            {data.servicesListed.map((item, index) => (
              <View key={`service-${index}`} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
            {data.manualProcessSignals.map((item, index) => (
              <View key={`signal-${index}`} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {data.opportunities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Where we can help</Text>
            {data.opportunities.map((opportunity, index) => (
              <View
                key={index}
                style={opportunity.isBestMatch ? [styles.opportunityCard, styles.opportunityCardBest] : styles.opportunityCard}
                wrap={false}
              >
                <View style={styles.opportunityHeaderRow}>
                  <Text style={styles.opportunityTitle}>{opportunity.opportunity}</Text>
                  {opportunity.isBestMatch && <Text style={styles.badge}>Recommended focus</Text>}
                </View>
                <Text style={styles.serviceTag}>{opportunity.arisoftService}</Text>
                <Text style={styles.opportunityExplanation}>{opportunity.explanation}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.ctaBlock}>
          <Text style={styles.ctaHeading}>Want to talk this through?</Text>
          <Text style={styles.ctaLine}>
            Get in touch at {SELLER.email} or visit {SELLER.website} — we&apos;d be happy to walk through these
            opportunities with you.
          </Text>
        </View>

        <Text style={styles.pageFooter} fixed>
          {SELLER.legalName} · {SELLER.website} · {SELLER.email}
        </Text>
      </Page>
    </Document>
  );
}
