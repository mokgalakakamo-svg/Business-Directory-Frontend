from database import engine
import models

# Drop the outdated table and recreate it with all the new columns
models.BusinessDocument.__table__.drop(engine, checkfirst=True)
models.Base.metadata.create_all(bind=engine)

print("Table schema updated successfully!")