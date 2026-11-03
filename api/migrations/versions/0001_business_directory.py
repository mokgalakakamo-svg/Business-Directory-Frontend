"""Create the business directory and link documents to businesses.

Revision ID: 0001_business_directory
Revises:
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_business_directory"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("registration_number", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("province", sa.String(length=100), nullable=True),
        sa.Column("postal_code", sa.String(length=30), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False, server_default="South Africa"),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=254), nullable=True),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_businesses_name", "businesses", ["name"])
    op.create_index("ix_businesses_registration_number", "businesses", ["registration_number"], unique=True)
    op.create_index("ix_businesses_industry", "businesses", ["industry"])
    op.create_index("ix_businesses_city", "businesses", ["city"])
    op.create_index("ix_businesses_province", "businesses", ["province"])
    op.create_index("ix_businesses_email", "businesses", ["email"])

    if "business_documents" not in inspector.get_table_names():
        op.create_table(
            "business_documents",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("business_id", sa.Integer(), nullable=True),
            sa.Column("document_type", sa.String(length=100), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=255), nullable=False),
            sa.Column("file_data", sa.LargeBinary(), nullable=False),
        )
    document_indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("business_documents")}
    if "ix_business_documents_business_id" not in document_indexes:
        op.create_index("ix_business_documents_business_id", "business_documents", ["business_id"])

    # Preserve document records created before businesses had their own table.
    op.execute(sa.text("""
        INSERT INTO businesses (id, name)
        SELECT DISTINCT business_id, 'Legacy business #' || business_id
        FROM business_documents
        WHERE business_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING
    """))
    op.execute(sa.text("""
        SELECT setval(
            pg_get_serial_sequence('businesses', 'id'),
            COALESCE(MAX(id), 1),
            MAX(id) IS NOT NULL
        ) FROM businesses
    """))
    op.create_foreign_key(
        "fk_business_documents_business_id_businesses",
        "business_documents",
        "businesses",
        ["business_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    op.drop_constraint("fk_business_documents_business_id_businesses", "business_documents", type_="foreignkey")
    op.drop_index("ix_businesses_email", table_name="businesses")
    op.drop_index("ix_businesses_province", table_name="businesses")
    op.drop_index("ix_businesses_city", table_name="businesses")
    op.drop_index("ix_businesses_industry", table_name="businesses")
    op.drop_index("ix_businesses_registration_number", table_name="businesses")
    op.drop_index("ix_businesses_name", table_name="businesses")
    op.drop_table("businesses")
