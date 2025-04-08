import { addDays } from 'date-fns';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import pg from 'pg';
import { capitalize, draw, random, range, title, trim } from 'radash';

const { Pool } = pg;

async function main() {
  const parsed = parseArgs({
    options: {
      port: { type: 'string', short: 'p' },
      url: { type: 'string', short: 'u' },
    },
  });

  const port = parsed.values.port || (await getPostgresPort());

  const url =
    parsed.values.url ||
    `postgres://postgres:postgres@localhost:${port}/postgres`;

  const db = new Kysely<SampleDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: url }),
    }),
  });

  await createSchema(db);
  const projects = await Promise.all(range(10).map(() => createProject(db)));
  const employees = await Promise.all(range(5).map(() => createEmployee(db)));
  const tasks = await Promise.all(
    range(10).map(async () => {
      const project = draw(projects);
      const employee = draw(employees);
      if (!project || !employee) {
        return null;
      }
      return createTask(db, project.id);
    })
  );
  for (const employee of employees) {
    for (const i of range(random(1, 5))) {
      const project = draw(projects);
      const task = draw(tasks);
      if (!project || !employee || !task) {
        continue;
      }
      await createAssignment(db, project.id, employee.id, task.id).catch(
        console.error
      );
    }
  }

  await db.destroy();
}

async function getPostgresPort() {
  // Run docker compose ps --format json
  const stdout = await new Promise<string>((resolve, reject) => {
    exec('docker compose ps --format json', (err, stdout, stderr) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });

  const data = JSON.parse(stdout);
  return data.Publishers.find((p: any) => p.TargetPort === 5432)?.PublishedPort;
}

async function createSchema(db: Kysely<any>) {
  await db.schema
    .dropTable('projects')
    .execute()
    .catch(() => {});
  await db.schema
    .createTable('projects')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .execute();

  await db.executeQuery(
    sql`DROP TYPE IF EXISTS task_status CASCADE`.compile(db)
  );
  await db.executeQuery(
    sql`CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed')`.compile(
      db
    )
  );

  await db.schema
    .dropTable('tasks')
    .execute()
    .catch(() => {});
  await db.schema
    .createTable('tasks')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('due_date', 'date', (col) => col.notNull())
    .addColumn('project_id', 'uuid', (col) => col.notNull())
    .addColumn('status', sql`task_status`, (col) => col.notNull())
    .execute();

  await db.schema
    .dropTable('employees')
    .execute()
    .catch(() => {});
  await db.schema
    .createTable('employees')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('phone', 'varchar(255)', (col) => col.notNull())
    .addColumn('address', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .dropTable('assignments')
    .execute()
    .catch(() => {});
  await db.schema
    .createTable('assignments')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('project_id', 'uuid', (col) => col.notNull())
    .addColumn('employee_id', 'uuid', (col) => col.notNull())
    .addColumn('task_id', 'uuid', (col) => col.notNull())
    .execute();
}

async function createProject(db: Kysely<any>) {
  const project = await db
    .insertInto('projects')
    .values({
      id: randomUUID(),
      name: capitalize(
        `${draw(VERBS)} ${draw(ARTICLES)} ${draw(ADJECTIVES)} ${draw(NOUNS)}`
      ),
    })
    .returningAll()
    .executeTakeFirst();

  return project;
}

async function createEmployee(db: Kysely<any>) {
  const firstName = draw(FIRST_NAMES);
  const lastName = draw(LAST_NAMES);

  const employee = await db
    .insertInto('employees')
    .values({
      id: randomUUID(),
      name: title(`${firstName} ${lastName}`),
      email: trim(
        `${firstName?.[0] || ''}.${lastName}@example.com`.toLowerCase(),
        '.'
      ),
      phone: `(${random(100, 999)}) ${random(100, 999)}-${random(1000, 9999)}`,
      address: `${random(1, 100)} ${draw(STREETS)}, ${draw(CITIES)} ${draw(
        STATES
      )} ${random(10000, 99999)}`,
    })
    .returningAll()
    .executeTakeFirst();

  return employee;
}

async function createTask(db: Kysely<any>, projectId: string) {
  const task = await db
    .insertInto('tasks')
    .values({
      id: randomUUID(),
      name: capitalize(
        `${draw(VERBS)} ${draw(ARTICLES)} ${draw(ADJECTIVES)} ${draw(NOUNS)}`
      ),
      due_date: addDays(new Date(), random(1, 30)),
      project_id: projectId,
      status: draw(['pending', 'in_progress', 'completed']),
    })
    .returningAll()
    .executeTakeFirst();

  return task;
}

async function createAssignment(
  db: Kysely<any>,
  projectId: string,
  employeeId: string,
  taskId: string
) {
  const assignment = await db
    .insertInto('assignments')
    .values({
      id: randomUUID(),
      project_id: projectId,
      employee_id: employeeId,
      task_id: taskId,
    })
    .returningAll()
    .executeTakeFirst();

  return assignment;
}

const VERBS = ['create', 'build', 'design', 'develop', 'test', 'deploy'];
const ARTICLES = ['a', 'the', 'our', 'my'];
const ADJECTIVES = ['beautiful', 'awesome', 'amazing', 'fantastic'];
const NOUNS = ['app', 'website', 'system', 'platform', 'solution'];
const FIRST_NAMES = ['John', 'Jane', 'Jim', 'Jill'];
const LAST_NAMES = ['Doe', 'Smith', 'Johnson', 'Williams'];
const STREETS = ['Main St', 'Second St', 'Third St', 'Fourth St'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston'];
const STATES = ['NY', 'CA', 'IL', 'TX'];

type SampleDatabase = {
  employees: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  projects: {
    id: string;
    name: string;
  };
  tasks: {
    id: string;
    name: string;
    due_date: Date;
    project_id: string;
    status: 'pending' | 'in_progress' | 'completed';
  };
  assignments: {
    id: string;
    employee_id: string;
    project_id: string;
    task_id: string;
  };
};

main().catch(console.error);
