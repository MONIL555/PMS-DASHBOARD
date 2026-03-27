import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';
import Ticket from '@/models/Ticket';
import Client from '@/models/Client';
import Product from '@/models/Product';
import ProjectType from '@/models/ProjectType';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    await connectDB();
    const auth = await verifyPermission(PERMISSIONS.ARCHIVES_VIEW);
    if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');
    const search = searchParams.get('search') || '';
    const typeFilter = searchParams.get('type') || 'All';
    const sortBy = searchParams.get('sortBy') || 'Newest';

    const getFilter = async (modelName: string, searchStr: string) => {
        const filter: any = {};
        if (modelName === 'Lead') filter.Lead_Status = 'Cancelled';
        if (modelName === 'Quotation') filter.Quotation_Status = 'Rejected';
        if (modelName === 'Project') filter.Pipeline_Status = 'Closed';
        if (modelName === 'Ticket') filter.Status = 'Closed';

        if (searchStr) {
            const clientIds = await Client.find({ Company_Name: { $regex: searchStr, $options: 'i' } }).distinct('_id');
            const productIds = await Product.find({ Product_Name: { $regex: searchStr, $options: 'i' } }).distinct('_id');
            
            const orClauses: any[] = [];
            if (modelName === 'Lead') {
                orClauses.push({ Lead_ID: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Cancel_Reason: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Client_Reference: { $in: clientIds } });
                orClauses.push({ Product_Reference: { $in: productIds } });
            } else if (modelName === 'Quotation') {
                orClauses.push({ Quotation_ID: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Cancel_Reason: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Client_Reference: { $in: clientIds } });
                orClauses.push({ Product_Reference: { $in: productIds } });
            } else if (modelName === 'Project') {
                orClauses.push({ Project_ID: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Project_Name: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ 'Termination.Reason': { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Client_Reference: { $in: clientIds } });
                orClauses.push({ Product_Reference: { $in: productIds } });
            } else if (modelName === 'Ticket') {
                orClauses.push({ Ticket_Number: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Title: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Cancel_Reason: { $regex: searchStr, $options: 'i' } });
                orClauses.push({ Client_Reference: { $in: clientIds } });
            }
            if (orClauses.length > 0) filter.$or = orClauses;
        }
        return filter;
    };

    const fetchAll = async () => {
        const results: any[] = [];
        const types = ['Lead', 'Quotation', 'Project', 'Ticket'];
        
        for (const type of types) {
            if (typeFilter !== 'All' && typeFilter !== type) continue;
            
            let model: any;
            let idField = '';
            let reasonField = '';
            if (type === 'Lead') { model = Lead; idField = 'Lead_ID'; reasonField = 'Cancel_Reason'; }
            if (type === 'Quotation') { model = Quotation; idField = 'Quotation_ID'; reasonField = 'Cancel_Reason'; }
            if (type === 'Project') { model = Project; idField = 'Project_ID'; reasonField = 'Termination.Reason'; }
            if (type === 'Ticket') { model = Ticket; idField = 'Ticket_Number'; reasonField = 'Cancel_Reason'; }

            const filter = await getFilter(type, search);
            const items = await model.find(filter)
                .select(`_id ${idField} ${reasonField.split('.')[0]} createdAt updatedAt`)
                .lean();
            
            results.push(...items.map((item: any) => ({
                _id: item._id,
                Original_Collection: type,
                Original_ID: item[idField],
                Cancel_Reason: reasonField.split('.').reduce((o, i) => o?.[i], item) || `${type} closed`,
                createdAt: item.updatedAt || item.createdAt
            })));
        }
        return results;
    };

    let allItems = await fetchAll();
    
    // Sort
    allItems.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortBy === 'Newest' ? dateB - dateA : dateA - dateB;
    });

    const totalItems = allItems.length;
    const paginatedItemsShort = allItems.slice((page - 1) * limit, page * limit);

    // Populate full data for the current page only (Second Pass)
    const fullItems = await Promise.all(paginatedItemsShort.map(async (item: any) => {
        let model: any;
        let populateKeys: any[] = [];
        if (item.Original_Collection === 'Lead') {
            model = Lead;
            populateKeys = [
                { path: 'Client_Reference', select: 'Company_Name Client_Name Email Contact_Number' },
                { path: 'Product_Reference', select: 'Product_Name' },
                { path: 'Source_Reference', select: 'Source_Name' }
            ];
        } else if (item.Original_Collection === 'Quotation') {
            model = Quotation;
            populateKeys = [
                { path: 'Client_Reference', select: 'Company_Name Client_Name Email Contact_Number' },
                { path: 'Product_Reference', select: 'Product_Name' },
                { path: 'Project_Type', select: 'Type_Name' }
            ];
        } else if (item.Original_Collection === 'Project') {
            model = Project;
            populateKeys = [
                { path: 'Lead_Reference', select: 'Lead_ID' },
                { path: 'Quotation_Reference', select: 'Quotation_ID' },
                { path: 'Client_Reference', select: 'Company_Name Client_Name Email Contact_Number' },
                { path: 'Product_Reference', select: 'Product_Name' },
                { path: 'Project_Type', select: 'Type_Name' }
            ];
        } else if (item.Original_Collection === 'Ticket') {
            model = Ticket;
            populateKeys = [
                { path: 'Client_Reference', select: 'Company_Name Client_Name Email Contact_Number' }
            ];
        }

        const fullData = await model.findById(item._id).populate(populateKeys).lean();
        return {
            ...item,
            Document_Data: fullData
        };
    }));

    // Counts for dashboard
    const statusCounts = {
        Lead: await Lead.countDocuments({ Lead_Status: 'Cancelled' }),
        Quotation: await Quotation.countDocuments({ Quotation_Status: 'Rejected' }),
        Project: await Project.countDocuments({ Pipeline_Status: 'Closed' }),
        Ticket: await Ticket.countDocuments({ Status: 'Closed' })
    };

    return NextResponse.json({
        archives: fullItems,
        totalItems,
        statusCounts
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
