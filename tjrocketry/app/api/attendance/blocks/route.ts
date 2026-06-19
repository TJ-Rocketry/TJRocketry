import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminOrSponsorAccess, checkAdminSponsorOrOfficerAccess } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const range = searchParams.get("range");

  if (range === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const blocks = await prisma.attendanceBlock.findMany({
      where: { date: { gte: weekAgo } },
      include: {
        records: { include: { user: true } },
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ blocks });
  }

  if (date) {
    const blocks = await prisma.attendanceBlock.findMany({
      where: { date: new Date(date) },
      include: {
        records: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ blocks });
  }

  const blocks = await prisma.attendanceBlock.findMany({
    include: {
      records: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ blocks });
}

export async function POST(request: Request) {
  const isAuthorized = await checkAdminOrSponsorAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { blockType, date, code } = await request.json();

    if (!blockType || !date || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const block = await prisma.attendanceBlock.create({
      data: {
        blockType,
        date: new Date(date),
        code,
      },
    });

    return NextResponse.json({ success: true, block });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create block" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const isAuthorized = await checkAdminOrSponsorAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, blockType, date, code } = await request.json();

    if (!id || !blockType || !date || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const block = await prisma.attendanceBlock.update({
      where: { id: Number(id) },
      data: {
        blockType,
        date: new Date(date),
        code,
      },
    });

    return NextResponse.json({ success: true, block });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const isAuthorized = await checkAdminSponsorOrOfficerAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing block id" }, { status: 400 });
    }

    await prisma.attendanceBlock.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete block" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const isAuthorized = await checkAdminSponsorOrOfficerAccess();
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id, isClosed } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing block id" }, { status: 400 });
    }

    const block = await prisma.attendanceBlock.update({
      where: { id: Number(id) },
      data: { isClosed },
    });

    return NextResponse.json({ success: true, block });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}
