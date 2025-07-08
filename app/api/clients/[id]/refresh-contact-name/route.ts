import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCompanyPSC, getCompanyOfficers, getBestContactName } from '@/lib/companies-house'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Get client
    const client = await db.client.findUnique({
      where: { id },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        contactName: true,
        companyNumber: true,
        companyType: true,
        isActive: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Only works for Limited Companies
    if (client.companyType !== 'LIMITED_COMPANY') {
      return NextResponse.json({ 
        error: 'Contact name refresh is only available for Limited Companies' 
      }, { status: 400 })
    }

    // Must have company number
    if (!client.companyNumber) {
      return NextResponse.json({ 
        error: 'Client must have a company number to refresh contact name' 
      }, { status: 400 })
    }

    // Fetch Companies House PSC and officers data directly
    let pscData, officersData
    try {
      const [pscResult, officersResult] = await Promise.allSettled([
        getCompanyPSC(client.companyNumber),
        getCompanyOfficers(client.companyNumber)
      ])
      
      pscData = pscResult.status === 'fulfilled' ? pscResult.value : null
      officersData = officersResult.status === 'fulfilled' ? officersResult.value : null
      
      if (!pscData && !officersData) {
        throw new Error('No PSC or officers data available')
      }
    } catch (error) {
      console.error('Failed to fetch Companies House data:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch Companies House data' 
      }, { status: 500 })
    }

    // Get best contact name using both PSC and officers data
    const directorName = getBestContactName(pscData, officersData, client.companyName)
    
    // If the result is the same as company name, no director was found
    if (directorName === client.companyName) {
      return NextResponse.json({ 
        changed: false,
        message: 'No directors found - contact name would remain as company name' 
      })
    }

    // Check if contact name would actually change
    if (directorName === client.contactName) {
      return NextResponse.json({ 
        message: 'Contact name already matches director name',
        contactName: client.contactName,
        directorName: directorName,
        changed: false
      })
    }

    // Update client
    const updatedClient = await db.client.update({
      where: { id },
      data: { contactName: directorName },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        contactName: true,
        companyNumber: true
      }
    })

    // Log the activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        clientId: client.id,
        action: 'REFRESH_CONTACT_NAME',
        details: JSON.stringify({
          clientCode: client.clientCode,
          oldContactName: client.contactName,
          newContactName: directorName,
          companyNumber: client.companyNumber,
          source: 'companies_house_psc_and_officers'
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Contact name updated successfully',
      client: updatedClient,
      changes: {
        oldContactName: client.contactName,
        newContactName: directorName
      },
      changed: true
    })

  } catch (error) {
    console.error('Error refreshing contact name:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 