import React from 'react';
import { Users, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NoTeamView = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8"
      >
        <Users className="w-12 h-12 text-purple-400" />
      </motion.div>
      
      <h2 className="text-3xl font-bold mb-4">No Workspace Selected</h2>
      <p className="text-gray-400 max-w-md mb-8">
        You need to join or create a workspace to access this feature. 
        Head over to Team Activity to manage your workspaces.
      </p>
      
      <Link
        to="/activity"
        className="flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
      >
        <Plus className="w-5 h-5" />
        Go to Team Activity
      </Link>
    </div>
  );
};

export default NoTeamView;
