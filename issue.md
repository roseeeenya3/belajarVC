# [TASK] Implementasi Registrasi User Baru (API & Database)

## 📌 Ringkasan Tugas
Mengimplementasikan fitur pendaftaran (registrasi) user baru pada aplikasi backend berbasis **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL**.

Dokumen ini disusun sebagai panduan langkah demi langkah yang detail, terstruktur, dan jelas untuk memandu junior programmer atau AI model dalam mengimplementasikan fitur ini secara presisi tanpa kebingungan.

---

## 🎯 Spesifikasi Kebutuhan

### 1. Skema Database (`users`)
Tabel `users` harus memiliki struktur kolom sebagai berikut:

| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Primary Key, Auto Increment |
| `name` | `VARCHAR(255)` | Not Null |
| `email` | `VARCHAR(255)` | Not Null, Unique (tidak boleh ada email kembar) |
| `password` | `VARCHAR(255)` | Not Null (berisi password yang telah di-hash menggunakan **bcrypt**) |
| `created_at` | `TIMESTAMP` | Default: `CURRENT_TIMESTAMP`, Not Null |

### 2. Spesifikasi Endpoint API
* **Method**: `POST`
* **Path**: `/api/users`
* **Content-Type**: `application/json`

#### Request Body (JSON)
Perhatikan format huruf kapital pada key JSON:
```json
{
  "Name": "Adit",
  "Email": "Adit@localhost",
  "Password": "1234"
}
```

#### Response Body
* **Sukses (HTTP Status: 201 Created)**:
  ```json
  {
    "Data": "Berhasil disimpan"
  }
  ```

* **Gagal - Email Duplikat (HTTP Status: 400 Bad Request atau 409 Conflict)**:
  ```json
  {
    "Error": "Email sudah terdaftar"
  }
  ```

* **Gagal - Validasi Input Tidak Sesuai (HTTP Status: 400 / 422 Unprocessable Entity)**:
  ```json
  {
    "Error": "Input tidak valid"
  }
  ```

---

## 📁 Struktur Folder & Konvensi File

Ikuti arsitektur pemisahan *Route* dan *Service* (Separation of Concerns). Struktur dalam folder `src/` harus seperti berikut:

```text
src/
├── db/
│   ├── index.ts          # Koneksi Drizzle ke MySQL (sudah ada)
│   └── schema.ts         # Definisi tabel Drizzle ORM
├── routes/
│   └── users-route.ts    # Handler routing & validasi request ElysiaJS
├── services/
│   └── users-service.ts  # Logic bisnis, hashing bcrypt, & interaksi database
└── index.ts              # Entry point aplikasi ElysiaJS
```

* **Aturan Penamaan File:**
  * File route: Gunakan format kebab-case diakhiri `-route.ts` (contoh: `users-route.ts`).
  * File service: Gunakan format kebab-case diakhiri `-service.ts` (contoh: `users-service.ts`).

---

## 🛠️ Panduan Langkah-demi-Langkah Implementasi

### Langkah 1: Perbarui Skema Drizzle ORM (`src/db/schema.ts`)
Buka file `src/db/schema.ts` dan perbarui definisi tabel `users` menggunakan kolom yang sesuai dari `drizzle-orm/mysql-core`:

```typescript
import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

---

### Langkah 2: Buat & Jalankan Migrasi Database
Jalankan script Drizzle Kit untuk membuat file migrasi dan menerapkannya ke database MySQL:

1. Generate file migrasi:
   ```bash
   bun run db:generate
   ```
2. Terapkan migrasi ke database:
   ```bash
   bun run db:migrate
   ```
*(Alternatif jika menggunakan push langsung untuk pengembangan lokal: `bunx drizzle-kit push`)*.

---

### Langkah 3: Buat Service Layer (`src/services/users-service.ts`)
Buat folder `src/services/` jika belum ada, lalu buat file `src/services/users-service.ts`.

**Tugas Service Layer:**
1. Menerima data registrasi (`Name`, `Email`, `Password`).
2. Melakukan pengecekan apakah `Email` sudah digunakan di database.
   - Jika sudah ada, lempar/kembalikan penanda error bahwa email sudah terdaftar.
3. Melakukan hashing password menggunakan algoritma **bcrypt**.
   > **Catatan Teknis Bun Runtime:**
   > Bun memiliki fungsi bawaan native yang cepat dan aman untuk hashing password dengan bcrypt:
   > `await Bun.password.hash(Password, { algorithm: "bcrypt", cost: 10 })`
   > Anda **tidak perlu** menginstal dependensi tambahan seperti `bcrypt` / `bcryptjs`.
4. Menyimpan user baru ke tabel database.

**Contoh Implementasi Kode:**
```typescript
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
```

---

### Langkah 4: Buat Routing Layer (`src/routes/users-route.ts`)
Buat folder `src/routes/` jika belum ada, lalu buat file `src/routes/users-route.ts`.

**Tugas Route Layer:**
1. Menggunakan instance `Elysia`.
2. Menerapkan skema validasi body menggunakan `t` dari `elysia` (memastikan `Name`, `Email`, dan `Password` berupa string dan tidak kosong).
3. Memanggil `usersService.register()`.
4. Mengembalikan response body yang sesuai dengan spesifikasi:
   - Jika sukses: status `201`, body `{ "Data": "Berhasil disimpan" }`.
   - Jika email terdaftar: status `400` (atau `409`), body `{ "Error": "Email sudah terdaftar" }`.
   - Jika terjadi error lain: status `500`, body `{ "Error": "Terjadi kesalahan pada server" }`.

**Contoh Implementasi Kode:**
```typescript
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
```

---

### Langkah 5: Registrasikan Route ke Entry Point (`src/index.ts`)
Buka file `src/index.ts` dan daftarkan `usersRoute` menggunakan method `.use()`.

**Contoh Update `src/index.ts`:**
```typescript
import { Elysia } from "elysia";
import { usersRoute } from "./routes/users-route";

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .get("/ping", () => "pong")
  .use(usersRoute)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
```

---

## 🧪 Panduan Pengujian & Verifikasi (Testing)

Jalankan server aplikasi terlebih dahulu:
```bash
bun run dev
```

### Uji Coba 1: Registrasi Berhasil (Positive Test)
Kirim request dengan data user baru menggunakan PowerShell atau cURL:

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method Post -ContentType "application/json" -Body '{"Name":"Adit","Email":"adit@localhost","Password":"1234"}'
```

**cURL / Bash:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"Name": "Adit", "Email": "adit@localhost", "Password": "1234"}'
```

* **Hasil yang diharapkan:**
  * Status Code: `201`
  * Response:
    ```json
    {
      "Data": "Berhasil disimpan"
    }
    ```

---

### Uji Coba 2: Registrasi Email Kembar (Duplicate Email Test)
Kirim request yang sama untuk kedua kalinya menggunakan data di atas:

* **Hasil yang diharapkan:**
  * Status Code: `400`
  * Response:
    ```json
    {
      "Error": "Email sudah terdaftar"
    }
    ```

---

### Uji Coba 3: Verifikasi Data & Hash Bcrypt di Database
Periksa isi tabel `users` di database MySQL:
```sql
SELECT id, name, email, password, created_at FROM users;
```
* **Kriteria:**
  * Kolom `password` harus berupa string hash bcrypt (diawali `$2b$` atau `$2a$`, panjang sekitar 60 karakter), **bukan plain text** `"1234"`.
  * Kolom `created_at` terisi timestamp waktu saat insert.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria Checklist)

Sebelum menandai tugas ini selesai, pastikan semua poin berikut terpenuhi:

- [ ] Skema database `users` memiliki kolom `id`, `name`, `email`, `password`, `created_at` dengan tipe data dan batasan yang sesuai.
- [ ] Migrasi database berhasil dijalankan tanpa error.
- [ ] Folder `src/routes/` dan `src/services/` telah dibuat dengan format penamaan file yang benar (`users-route.ts` & `users-service.ts`).
- [ ] Logic bisnis berada di `src/services/users-service.ts`.
- [ ] Handler route dan validasi input berada di `src/routes/users-route.ts`.
- [ ] Password user tersimpan dalam bentuk hash bcrypt di database.
- [ ] Endpoint `POST /api/users` mengembalikan response `{ "Data": "Berhasil disimpan" }` dengan status 201 saat berhasil.
- [ ] Endpoint `POST /api/users` mengembalikan response `{ "Error": "Email sudah terdaftar" }` dengan status 400 saat email sudah pernah terdaftar.
- [ ] Server dijalankan tanpa error menggunakan perintah `bun run dev`.
