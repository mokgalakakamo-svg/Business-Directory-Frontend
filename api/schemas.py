from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl


class BusinessFields(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    registration_number: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None
    industry: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    province: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=30)
    country: str = Field(default="South Africa", min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = Field(default=None, max_length=254)
    website: Optional[HttpUrl] = Field(default=None, max_length=255)


class BusinessCreate(BusinessFields):
    pass


class BusinessUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    registration_number: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = None
    industry: Optional[str] = Field(default=None, max_length=100)
    address: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    province: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=30)
    country: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[EmailStr] = Field(default=None, max_length=254)
    website: Optional[HttpUrl] = Field(default=None, max_length=255)


class BusinessRead(BusinessFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
