from enum import Enum


class DocumentType(str, Enum):
    CIPC_REGISTRATION = "cipc_registration"
    TAX_CLEARANCE = "tax_clearance"
    BBBEE_CERTIFICATE = "bbbee_certificate"
    PROOF_OF_ADDRESS = "proof_of_address"
    COMPANY_PROFILE = "company_profile"
    BANK_CONFIRMATION = "bank_confirmation"
    VAT_REGISTRATION = "vat_registration"
    DIRECTOR_ID = "director_id"
    OTHER = "other"


DOCUMENT_TYPE_LABELS = {
    DocumentType.CIPC_REGISTRATION: "CIPC registration certificate",
    DocumentType.TAX_CLEARANCE: "Tax clearance certificate",
    DocumentType.BBBEE_CERTIFICATE: "B-BBEE certificate or affidavit",
    DocumentType.PROOF_OF_ADDRESS: "Proof of address",
    DocumentType.COMPANY_PROFILE: "Company profile",
    DocumentType.BANK_CONFIRMATION: "Bank confirmation letter",
    DocumentType.VAT_REGISTRATION: "VAT registration certificate",
    DocumentType.DIRECTOR_ID: "Director or member ID",
    DocumentType.OTHER: "Other",
}
