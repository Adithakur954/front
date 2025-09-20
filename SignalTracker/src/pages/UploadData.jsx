import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { excelApi } from '../api/apiEndpoints'; 
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, X, Download } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SessionSelector from '../components/common/SessionSelector';

const UploadDataPage = () => {
    const [sessionFiles, setSessionFiles] = useState([]);
    const [predictionFiles, setPredictionFiles] = useState([]);
    const [polygonFile, setPolygonFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [remarks, setRemarks] = useState('');
    const [projectName, setProjectName] = useState('');
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('session');

    const onDropSession = useCallback((acceptedFiles) => setSessionFiles(prev => [...prev, ...acceptedFiles]), []);
    const onDropPrediction = useCallback((acceptedFiles) => setPredictionFiles(prev => [...prev, ...acceptedFiles]), []);
    const onDropPolygon = useCallback((acceptedFiles) => setPolygonFile(acceptedFiles[0]), []);

    const fileTypes = {
        'text/csv': ['.csv'],
        'application/zip': ['.zip'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    };

    const polygonFileTypes = {
        'application/zip': ['.zip'],
        'text/csv': ['.csv'],
        'application/geo+json': ['.geojson'],
    };

    const { getRootProps: getRootPropsSession, getInputProps: getInputPropsSession, isDragActive: isDragActiveSession } = useDropzone({ onDrop: onDropSession, accept: fileTypes, multiple: false });
    const { getRootProps: getRootPropsPrediction, getInputProps: getInputPropsPrediction, isDragActive: isDragActivePrediction } = useDropzone({ onDrop: onDropPrediction, accept: fileTypes, multiple: false });
    const { getRootProps: getRootPropsPolygon, getInputProps: getInputPropsPolygon, isDragActive: isDragActivePolygon } = useDropzone({ onDrop: onDropPolygon, accept: polygonFileTypes, multiple: false });


    const removeFile = (fileToRemove, type) => {
        if (type === 'session') setSessionFiles(files => files.filter(file => file !== fileToRemove));
        else if (type === 'prediction') setPredictionFiles(files => files.filter(file => file !== fileToRemove));
        else if (type === 'polygon') setPolygonFile(null);
    };

    const fetchUploadedFiles = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const response = await excelApi.getUploadedFiles(0);
            setUploadedFiles(response.Data || []);
        } catch (error) {
            toast.error(`Failed to fetch uploaded files: ${error.message}`);
            setUploadedFiles([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUploadedFiles();
    }, [fetchUploadedFiles]);

    const handleUpload = async () => {
        const files = activeTab === 'session' ? sessionFiles : predictionFiles;
        if (files.length === 0) {
            toast.warn("Please select a file to upload.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('UploadFile', files[0]);
        if (polygonFile) formData.append('UploadNoteFile', polygonFile);
        formData.append('remarks', remarks);
        formData.append('token', 'your-auth-token'); 
        formData.append('ip', 'user-ip-address'); 
        
        if (activeTab === 'prediction') {
            formData.append('ProjectName', projectName);
            formData.append('SessionIds', selectedSessions.join(','));
            formData.append('UploadFileType', "2");
        } else {
            formData.append('ProjectName', '');
            formData.append('SessionIds', '');
            formData.append('UploadFileType', "1");
        }

        try {
            const response = await excelApi.uploadFile(formData);
            if (response.Status === 1) {
                toast.success(response.Message || 'File uploaded successfully!');
                setSessionFiles([]);
                setPredictionFiles([]);
                setPolygonFile(null);
                setRemarks('');
                setProjectName('');
                setSelectedSessions([]);
                fetchUploadedFiles(); 
            } else {
                toast.error(response.Message || 'An unknown error occurred during upload.');
            }
        } catch (error) {
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDownloadTemplate = async () => {
        try {
            const blob = await excelApi.downloadTemplate(1);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error(`Failed to download template: ${error.message}`);
        }
    };

    const renderFileInput = (getRootProps, getInputProps, isDragActive, files, type) => (
        <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
                {isDragActive ? 'Drop the file here...' : "Drag 'n' drop a file here, or click to select a file"}
            </p>
            {files.length > 0 && (
                <div className="mt-4">
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                            <div className="flex items-center space-x-2">
                                <File className="h-5 w-5 text-gray-500" />
                                <span>{file.name}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeFile(file, type); }} className="text-red-500 hover:text-red-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="p-6 h-full flex flex-col items-center">
            <div className="w-full max-w-4xl">
                <h1 className="text-2xl font-semibold mb-4 text-center">Upload Data</h1>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="session">Upload Session Data</TabsTrigger>
                        <TabsTrigger value="prediction">Upload Prediction Data</TabsTrigger>
                    </TabsList>

                    <TabsContent value="session" className="space-y-4 mt-4">
                        {renderFileInput(getRootPropsSession, getInputPropsSession, isDragActiveSession, sessionFiles, 'session')}
                        <div>
                            <label className="font-semibold">Inbound Polygon File (Optional)</label>
                            {renderFileInput(getRootPropsPolygon, getInputPropsPolygon, isDragActivePolygon, polygonFile ? [polygonFile] : [], 'polygon')}
                        </div>
                        <Textarea placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </TabsContent>

                    <TabsContent value="prediction" className="space-y-4 mt-4">
                        {renderFileInput(getRootPropsPrediction, getInputPropsPrediction, isDragActivePrediction, predictionFiles, 'prediction')}
                        <div>
                            <label className="font-semibold">Inbound Polygon File (Optional)</label>
                            {renderFileInput(getRootPropsPolygon, getInputPropsPolygon, isDragActivePolygon, polygonFile ? [polygonFile] : [], 'polygon')}
                        </div>
                        <Input placeholder="Project Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                        <SessionSelector selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} />
                        <Textarea placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </TabsContent>
                </Tabs>
                
                <div className="mt-8 text-center">
                    <Button onClick={handleUpload} disabled={loading} size="lg">
                        {loading ? <Spinner /> : 'Upload File'}
                    </Button>
                    <Button onClick={handleDownloadTemplate} variant="outline" className="ml-4" size="lg">
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                </div>

                <div className="mt-10">
                    <h2 className="text-xl font-semibold mb-4">Uploaded Files History</h2>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Uploaded By</TableHead>
                                    <TableHead>Uploaded On</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center"><Spinner/></TableCell></TableRow>
                                ) : uploadedFiles.length > 0 ? (
                                    uploadedFiles.map((file) => (
                                        <TableRow key={file.id}>
                                            {/* **Corrected property names to match the backend** */}
                                            <TableCell>{file.file_name}</TableCell>
                                            <TableCell>{file.uploaded_by}</TableCell>
                                            <TableCell>{new Date(file.uploaded_on).toLocaleString()}</TableCell>
                                            <TableCell>{file.status}</TableCell>
                                            <TableCell>{file.remarks}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">No history found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadDataPage;