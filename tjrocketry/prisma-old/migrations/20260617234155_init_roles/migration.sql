-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "ionId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "roles" TEXT[] DEFAULT ARRAY['user']::TEXT[],
    "pfpUrl" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_ionId_key" ON "User"("ionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
