from __future__ import annotations

import unittest

from backend.filing_parser import FilingParseError, parse_information_table


SAMPLE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<informationTable xmlns="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <infoTable>
    <nameOfIssuer>APPLE INC</nameOfIssuer>
    <titleOfClass>COM</titleOfClass>
    <cusip>037833100</cusip>
    <figi>BBG000B9XRY4</figi>
    <value>123456789</value>
    <shrsOrPrnAmt>
      <sshPrnamt>2000000</sshPrnamt>
      <sshPrnamtType>SH</sshPrnamtType>
    </shrsOrPrnAmt>
    <investmentDiscretion>SOLE</investmentDiscretion>
    <votingAuthority>
      <Sole>2000000</Sole>
      <Shared>0</Shared>
      <None>0</None>
    </votingAuthority>
  </infoTable>
  <infoTable>
    <nameOfIssuer>EXAMPLE OPTIONS</nameOfIssuer>
    <titleOfClass>CALL</titleOfClass>
    <cusip>123456789</cusip>
    <value>5000</value>
    <shrsOrPrnAmt>
      <sshPrnamt>100</sshPrnamt>
      <sshPrnamtType>SH</sshPrnamtType>
    </shrsOrPrnAmt>
    <putCall>Call</putCall>
    <investmentDiscretion>DFND</investmentDiscretion>
    <otherManager>1</otherManager>
    <votingAuthority>
      <Sole>0</Sole>
      <Shared>100</Shared>
      <None>0</None>
    </votingAuthority>
  </infoTable>
</informationTable>
"""


class FilingParserTests(unittest.TestCase):
    def test_parses_namespaced_information_table(self) -> None:
        holdings = parse_information_table(SAMPLE_XML, filing_date="2026-05-15")

        self.assertEqual(len(holdings), 2)
        apple = holdings[0]
        self.assertEqual(apple.issuer, "APPLE INC")
        self.assertEqual(apple.cusip, "037833100")
        self.assertEqual(apple.figi, "BBG000B9XRY4")
        self.assertEqual(apple.reported_value, 123456789)
        self.assertEqual(apple.value_usd, 123456789)
        self.assertEqual(apple.shares_or_principal_amount, 2000000)
        self.assertIsNone(apple.put_call)

        option = holdings[1]
        self.assertEqual(option.put_call, "Call")
        self.assertEqual(option.other_manager, "1")
        self.assertEqual(option.voting_authority_shared, 100)

    def test_converts_pre_2023_reported_thousands_to_dollars(self) -> None:
        holdings = parse_information_table(SAMPLE_XML, filing_date="2022-11-14")

        self.assertEqual(holdings[0].reported_value, 123456789)
        self.assertEqual(holdings[0].value_usd, 123456789000)

    def test_rejects_non_information_table_xml(self) -> None:
        with self.assertRaisesRegex(FilingParseError, "root element"):
            parse_information_table("<edgarSubmission />", filing_date="2026-05-15")

    def test_rejects_invalid_integer_fields(self) -> None:
        invalid_xml = SAMPLE_XML.replace(
            "<sshPrnamt>2000000</sshPrnamt>",
            "<sshPrnamt>not-a-number</sshPrnamt>",
            1,
        )

        with self.assertRaisesRegex(FilingParseError, "sshPrnamt"):
            parse_information_table(invalid_xml, filing_date="2026-05-15")


if __name__ == "__main__":
    unittest.main()
