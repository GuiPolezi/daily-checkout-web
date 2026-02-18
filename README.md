This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Metadados Projeto
------------------------
Passo 1: O Backend (Supabase)

Vamos usar o Supabase para o Banco de Dados e Autenticação.

- Crie uma conta em supabase.com e crie um novo projeto
- Vá até a aba SQL Editor
- Crie as tabelas

Vá em Settings > API e copie:
- Project URL
- anon public key.

Passo 2: O Frontend (Next.js)
- Clone o repositorio

"git clone ...."

- Entre na pasta e instale a biblioteca do Supabase:
npm install @supabase/supabase-js

- Crie um arquivo na raiz do projeto chamado .env.local e coloque suas chaves:

Passo 3: O Código (A Lógica)
estrutura simplificada para funcionar em um único arquivo principal para facilitar o entendimento

- arquivo src/lib/supabaseClient.ts
- Arquivo Page.tsx



## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
