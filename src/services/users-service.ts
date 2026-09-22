import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export interface RegisterUserInput {
  Name: string;
  Email: string;
  Password: string;
}

export class UsersService {
  /**
   * Mendaftarkan user baru.
   * Melempar Error jika email sudah ada di database.
   */
  async register(input: RegisterUserInput) {
    const { Name, Email, Password } = input;

    // 1. Cek apakah email sudah terdaftar
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, Email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error("EMAIL_EXISTS");
    }

    // 2. Hash password dengan bcrypt menggunakan Bun.password
    const hashedPassword = await Bun.password.hash(Password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // 3. Simpan ke database
    await db.insert(users).values({
      name: Name,
      email: Email,
      password: hashedPassword,
    });

    return { success: true };
  }
}

export const usersService = new UsersService();
