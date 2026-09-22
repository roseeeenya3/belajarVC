import { Elysia, t } from "elysia";
import { usersService } from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/api" }).post(
  "/users",
  async ({ body, set }) => {
    try {
      await usersService.register({
        Name: body.Name,
        Email: body.Email,
        Password: body.Password,
      });

      set.status = 201;
      return {
        Data: "Berhasil disimpan",
      };
    } catch (error: any) {
      if (error.message === "EMAIL_EXISTS") {
        set.status = 400; // atau 409 Conflict
        return {
          Error: "Email sudah terdaftar",
        };
      }

      set.status = 500;
      return {
        Error: "Terjadi kesalahan pada server",
      };
    }
  },
  {
    body: t.Object({
      Name: t.String({ minLength: 1, error: "Name wajib diisi" }),
      Email: t.String({ format: "email", error: "Format Email tidak valid" }),
      Password: t.String({ minLength: 4, error: "Password minimal 4 karakter" }),
    }),
  }
);
