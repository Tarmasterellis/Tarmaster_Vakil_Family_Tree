-- CreateTable
CREATE TABLE "FamilyNode" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "data" JSONB NOT NULL,
    "rels" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyNode_pkey" PRIMARY KEY ("id")
);
