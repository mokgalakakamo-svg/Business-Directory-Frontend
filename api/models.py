from sqlalchemy import Column, DateTime, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import relationship

from database import Base


class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    registration_number = Column(String(100), unique=True, index=True)
    description = Column(Text)
    industry = Column(String(100), index=True)
    address = Column(String(255))
    city = Column(String(100), index=True)
    province = Column(String(100), index=True)
    postal_code = Column(String(30))
    country = Column(String(100), nullable=False, default="South Africa")
    phone = Column(String(50))
    email = Column(String(254), index=True)
    website = Column(String(255))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    documents = relationship("BusinessDocument", back_populates="business", cascade="all, delete-orphan")


class BusinessDocument(Base):
    __tablename__ = "business_documents"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=True, index=True)
    document_type = Column(String(100), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(255), nullable=False)
    file_data = Column(LargeBinary, nullable=False)

    business = relationship("Business", back_populates="documents")
