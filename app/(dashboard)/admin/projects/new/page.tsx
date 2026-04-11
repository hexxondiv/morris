import ProjectForm from '@/components/components/project-form'
import { ensureAuthorized } from '@/lib/supabase-admin';
import React from 'react'

const page = async () => {
  await ensureAuthorized("admin");

  return (
    <main className="max-w-[75rem] w-full mx-auto">
      <div className="container max-w-3xl mx-auto mb-12">
        <ProjectForm />
      </div>
    </main>
  )
}

export default page
