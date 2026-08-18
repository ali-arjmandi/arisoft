import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { SELLER } from "./seller";
import { formatCurrencyEUR, formatInvoiceDate } from "./format";
import { calculateDueDate } from "./calculations";
import type { InvoiceDocumentData } from "./types";

const COLORS = {
  primary: "#0140bf",
  foreground: "#262626",
  body: "#374151",
  muted: "#666666",
  border: "#dddddd",
  surfaceMuted: "#fafafa",
};

// The source logo is 859x759 — keep that aspect ratio at whatever width it's
// rendered so it never looks stretched.
const LOGO_WIDTH = 130;
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
    marginBottom: 32,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 20,
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
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  partyColumn: {
    width: "45%",
  },
  partyLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.foreground,
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 9,
    color: COLORS.body,
    marginTop: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableCellDescription: {
    flex: 1,
    fontSize: 9,
  },
  tableCellAmount: {
    width: 110,
    fontSize: 9,
    textAlign: "right",
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 600,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalsBlock: {
    alignSelf: "flex-end",
    width: 220,
    marginTop: 16,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLORS.body,
  },
  totalsValue: {
    fontSize: 9,
    color: COLORS.foreground,
  },
  totalsDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    paddingTop: 8,
  },
  totalsFinalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.foreground,
  },
  totalsFinalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.foreground,
  },
  paymentBlock: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  paymentHeading: {
    fontSize: 9,
    fontWeight: 600,
    color: COLORS.foreground,
    marginBottom: 6,
  },
  paymentLine: {
    fontSize: 9,
    color: COLORS.body,
    marginTop: 2,
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

interface InvoiceDocumentProps {
  data: InvoiceDocumentData;
  useFallbackFont?: boolean;
}

export function InvoiceDocument({ data, useFallbackFont }: InvoiceDocumentProps) {
  const dueDate = calculateDueDate(data.invoiceDate, SELLER.paymentTermDays);
  const showDeliveryDate = Boolean(data.deliveryDate) && data.deliveryDate !== data.invoiceDate;

  return (
    <Document title={`Invoice ${data.invoiceNumber}`}>
      <Page size="A4" style={[styles.page, useFallbackFont ? undefined : styles.pagePoppins]}>
        <View style={styles.headerRow}>
          {/* This is react-pdf's <Image>, not an HTML <img> — it has no alt prop. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/images/logo/full-lockup-transparent-blue.png" style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.headerMeta}>Invoice number: {data.invoiceNumber}</Text>
            <Text style={styles.headerMeta}>Date: {formatInvoiceDate(data.invoiceDate)}</Text>
            {showDeliveryDate && (
              <Text style={styles.headerMeta}>Delivery date: {formatInvoiceDate(data.deliveryDate)}</Text>
            )}
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{SELLER.legalName}</Text>
            {SELLER.addressLines.map((line, index) => (
              <Text key={index} style={styles.partyLine}>
                {line}
              </Text>
            ))}
            <Text style={styles.partyLine}>KvK: {SELLER.kvkNumber}</Text>
            <Text style={styles.partyLine}>BTW: {SELLER.btwNumber}</Text>
            <Text style={styles.partyLine}>{SELLER.email}</Text>
          </View>
          <View style={styles.partyColumn}>
            <Text style={styles.partyLabel}>Bill to</Text>
            <Text style={styles.partyName}>{data.buyerName}</Text>
            {data.buyerAddressLines.map((line, index) => (
              <Text key={index} style={styles.partyLine}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCellDescription, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.tableCellAmount, styles.tableHeaderText]}>Amount excl. BTW</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellDescription}>{data.description}</Text>
            <Text style={styles.tableCellAmount}>{formatCurrencyEUR(data.totals.amountExclBtw)}</Text>
          </View>
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal (excl. BTW)</Text>
            <Text style={styles.totalsValue}>{formatCurrencyEUR(data.totals.amountExclBtw)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>BTW ({data.btwRate}%)</Text>
            <Text style={styles.totalsValue}>{formatCurrencyEUR(data.totals.btwAmount)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.totalsDivider]}>
            <Text style={styles.totalsFinalLabel}>Total (incl. BTW)</Text>
            <Text style={styles.totalsFinalValue}>{formatCurrencyEUR(data.totals.amountInclBtw)}</Text>
          </View>
        </View>

        <View style={styles.paymentBlock}>
          <Text style={styles.paymentHeading}>Payment details</Text>
          <Text style={styles.paymentLine}>IBAN: {SELLER.iban}</Text>
          <Text style={styles.paymentLine}>Payment terms: Net {SELLER.paymentTermDays} days</Text>
          {dueDate && <Text style={styles.paymentLine}>Due date: {formatInvoiceDate(dueDate)}</Text>}
          <Text style={styles.paymentLine}>
            Please reference invoice number {data.invoiceNumber} with your payment.
          </Text>
        </View>

        <Text style={styles.pageFooter} fixed>
          {SELLER.legalName} · KvK {SELLER.kvkNumber} · BTW {SELLER.btwNumber} · {SELLER.website}
        </Text>
      </Page>
    </Document>
  );
}
