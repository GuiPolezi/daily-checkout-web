import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, date, tasks } = await req.json();

    // 1. Configuração do transportador SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, // true para 465, false para outras portas
      debug: true,   // <--- ADICIONE ISSO
      logger: true,  // <--- ADICIONE ISSO
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Permite conexões com certificados autoassinados
      }
    });

    // 2. Formata a lista de tarefas para o HTML
    const taskListHtml = tasks
      .map((t: any) => `
        <li style="margin-bottom: 8px;">
          ${t.done ? '<span style="color: green;">✅</span>' : '<span style="color: red;">❌</span>'} 
          <strong>${t.title}</strong> - <small>Prioridade: ${t.prio}</small>
        </li>`)
      .join('');

    // 3. Configura o conteúdo do e-mail
    const mailOptions = {
      from: `"${email}" <${process.env.SMTP_USER}>`, // Nome do usuário, mas enviado pelo seu SMTP
      to: process.env.REPORT_RECIPIENT_EMAIL,
      subject: `Relatório de Checkout - ${email} - ${date}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Relatório de Atividades</h2>
          <p><strong>Colaborador:</strong> ${email}</p>
          <p><strong>Data:</strong> ${date}</p>
          <hr />
          <ul style="list-style: none; padding: 0;">
            ${taskListHtml}
          </ul>
        </div>
      `,
    };

    // 4. Envia o e-mail
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'E-mail enviado com sucesso!' });

  } catch (error: any) {
    console.error('Erro no SMTP:', error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail', details: error.message }, { status: 500 });
  }
}